const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
    new SlashCommandBuilder()
        .setName('drop')
        .setDescription('Crea un drop con botón de claim')
        .addStringOption(option =>
            option.setName('mensaje')
                .setDescription('El mensaje que aparecerá en el embed')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('hoster')
                .setDescription('La persona que creó el drop')
                .setRequired(true)
        )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Registrando comandos slash...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log('Comandos registrados exitosamente!');
    } catch (error) {
        console.error('Error al registrar comandos:', error);
    }
})();

client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

function getRandomColor() {
    return Math.floor(Math.random() * 16777215);
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() && !interaction.isButton()) return;

    if (interaction.isCommand() && interaction.commandName === 'drop') {
        const mensaje = interaction.options.getString('mensaje');
        const hoster = interaction.options.getUser('hoster');

        const embed = new EmbedBuilder()
            .setColor(getRandomColor())
            .setTitle('🎁 Drop Activo')
            .setDescription(mensaje)
            .addFields(
                { name: '👤 Hoster', value: `${hoster}`, inline: true },
                { name: '⏳ Estado', value: 'Esperando...', inline: true }
            )
            .setTimestamp();

        await interaction.channel.send({
            content: '@here',
            allowedMentions: { parse: ['everyone'] }
        });

        await interaction.reply({ 
            embeds: [embed],
            fetchReply: true 
        });

        const message = await interaction.fetchReply();

        setTimeout(async () => {
            const button = new ButtonBuilder()
                .setCustomId('claim_drop')
                .setLabel('Claim')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✋');

            const row = new ActionRowBuilder().addComponents(button);

            const updatedEmbed = new EmbedBuilder()
                .setColor(getRandomColor())
                .setTitle('🎁 Drop Activo')
                .setDescription(mensaje)
                .addFields(
                    { name: '👤 Hoster', value: `${hoster}`, inline: true },
                    { name: '⏳ Estado', value: '¡Haz click en el botón!', inline: true }
                )
                .setTimestamp();

            await message.edit({ 
                embeds: [updatedEmbed], 
                components: [row] 
            });
        }, 3000);
    }

    if (interaction.isButton() && interaction.customId === 'claim_drop') {
        const embed = interaction.message.embeds[0];
        
        const disabledButton = ButtonBuilder.from(interaction.message.components[0].components[0])
            .setDisabled(true);

        const row = new ActionRowBuilder().addComponents(disabledButton);

        const winnerEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎉 Drop Reclamado')
            .setDescription(embed.description)
            .addFields(
                { name: '👤 Hoster', value: embed.fields[0].value, inline: true },
                { name: '🏆 Ganador', value: `${interaction.user}`, inline: true }
            )
            .setTimestamp();

        await interaction.update({ 
            embeds: [winnerEmbed], 
            components: [row] 
        });

        await interaction.followUp({ 
            content: `🎊 ¡Felicidades ${interaction.user}! Has ganado el drop.`,
            ephemeral: false 
        });
    }
});

client.login(TOKEN);
