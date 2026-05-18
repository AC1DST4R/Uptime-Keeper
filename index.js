require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");

const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
} = require("@discordjs/voice");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Store voice connections
const voiceConnections = new Map();

// READY
client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Replies with Pong!"),

    new SlashCommandBuilder()
      .setName("join")
      .setDescription("Join your current voice channel"),

    new SlashCommandBuilder()
      .setName("leave")
      .setDescription("Leave the voice channel"),
  ].map(command => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_TOKEN
  );

  try {
    console.log("Registering slash commands...");

    // REGISTER GUILD COMMANDS (instant updates)
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Slash commands registered.");
  } catch (error) {
    console.error(error);
  }
});

// INTERACTIONS
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // /ping
  if (interaction.commandName === "ping") {
    return interaction.reply("🏓 Pong!");
  }

  // /join
  if (interaction.commandName === "join") {
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ You need to join a voice channel first.",
        ephemeral: true,
      });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      await entersState(
        connection,
        VoiceConnectionStatus.Ready,
        30_000
      );

      voiceConnections.set(interaction.guild.id, connection);

      connection.on("stateChange", (_, newState) => {
        console.log(`VC State: ${newState.status}`);
      });

      return interaction.reply(
        `✅ Joined **${voiceChannel.name}**`
      );
    } catch (error) {
      console.error(error);

      return interaction.reply({
        content: "❌ Failed to join the VC.",
        ephemeral: true,
      });
    }
  }

  // /leave
  if (interaction.commandName === "leave") {
    const connection = voiceConnections.get(interaction.guild.id);

    if (!connection) {
      return interaction.reply({
        content: "❌ I'm not in a VC.",
        ephemeral: true,
      });
    }

    connection.destroy();
    voiceConnections.delete(interaction.guild.id);

    return interaction.reply("👋 Left the voice channel.");
  }
});

// LOGIN
client.login(process.env.DISCORD_TOKEN);