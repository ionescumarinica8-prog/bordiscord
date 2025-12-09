// ======================
// 📦 IMPORTS DISCORD.JS v14 + ENV
// ======================
require('dotenv').config(); // Încarcă variabilele din .env

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ChannelType,
    Collection
} = require('discord.js');

// ======================
// ⚙️ CONFIGURATION DIN .env
// ======================
const CONFIG = {
    TOKEN: process.env.DISCORD_TOKEN, // ← AICI se citește din .env
    OWNER_ID: process.env.OWNER_ID || '1243946749320495106',
    PREFIX: '!',
    LOGS_CHANNEL: process.env.LOGS_CHANNEL || '1407691669142241424',
    COLORS: {
        PRIMARY: 0x5865F2,
        SUCCESS: 0x57F287,
        WARNING: 0xFEE75C,
        DANGER: 0xED4245,
        INFO: 0x00B0F4
    }
};

// Verifică dacă token-ul există
if (!CONFIG.TOKEN) {
    console.error('❌ ERROR: DISCORD_TOKEN nu este setat!');
    console.error('👉 Pentru local: creează fișier .env cu DISCORD_TOKEN=...');
    console.error('👉 Pentru Render: adaugă variabila de mediu DISCORD_TOKEN');
    process.exit(1);
}

// ======================
// 🤖 CLIENT SETUP
// ======================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Storage
client.logs = new Collection();
client.announcements = new Collection();

// ======================
// 🎨 UI COMPONENTS - DROPDOWN ONLY
// ======================
class WidUI {
    // 🏠 MAIN DASHBOARD
    static createMainDashboard(guild, user) {
        const embed = new EmbedBuilder()
            .setColor(CONFIG.COLORS.PRIMARY)
            .setTitle('🌟 **WID COMMUNITY MANAGER**')
            .setDescription('*Select an option from the menu below:*')
            .addFields(
                {
                    name: '📢 **ANNOUNCEMENTS**',
                    value: 'Create beautiful announcements for your community',
                    inline: false
                },
                {
                    name: '📊 **SERVER STATS**',
                    value: `Members: ${guild.memberCount} | Channels: ${guild.channels.cache.size} | Roles: ${guild.roles.cache.size}`,
                    inline: false
                }
            )
            .setFooter({ text: 'Made with ❤️ by Wid' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('main_menu')
                .setPlaceholder('📋 Select an option...')
                .addOptions([
                    {
                        label: 'Create Announcement',
                        description: 'Send an announcement to any channel',
                        value: 'menu_announce',
                        emoji: '📢'
                    },
                    {
                        label: 'View Server Logs',
                        description: 'See all bot activity logs',
                        value: 'menu_logs',
                        emoji: '📁'
                    },
                    {
                        label: 'Server Statistics',
                        description: 'View detailed server analytics',
                        value: 'menu_stats',
                        emoji: '📊'
                    },
                    {
                        label: 'Member Management',
                        description: 'Manage server members',
                        value: 'menu_members',
                        emoji: '👥'
                    },
                    {
                        label: 'Close Menu',
                        description: 'Close this menu',
                        value: 'menu_close',
                        emoji: '❌'
                    }
                ])
        );

        return { embeds: [embed], components: [row] };
    }

    // 📢 ANNOUNCEMENT TYPE SELECTOR
    static createAnnouncementTypeMenu() {
        const embed = new EmbedBuilder()
            .setColor(CONFIG.COLORS.INFO)
            .setTitle('🎨 **CHOOSE ANNOUNCEMENT TYPE**')
            .setDescription('*Select the type of announcement you want to create:*')
            .addFields(
                {
                    name: '📝 **STANDARD**',
                    value: 'Simple text announcement',
                    inline: true
                },
                {
                    name: '🌟 **EMBED**',
                    value: 'Beautiful formatted embed',
                    inline: true
                },
                {
                    name: '🚨 **EMERGENCY**',
                    value: 'Urgent @everyone announcement',
                    inline: true
                }
            );

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('announce_type')
                .setPlaceholder('🎯 Select announcement type...')
                .addOptions([
                    {
                        label: 'Standard Text',
                        description: 'Simple text message',
                        value: 'type_standard',
                        emoji: '📝'
                    },
                    {
                        label: 'Embed Format',
                        description: 'Beautiful embed message',
                        value: 'type_embed',
                        emoji: '🌟'
                    },
                    {
                        label: 'Emergency',
                        description: '@everyone urgent message',
                        value: 'type_emergency',
                        emoji: '🚨'
                    },
                    {
                        label: 'Event Announcement',
                        description: 'Event with date and time',
                        value: 'type_event',
                        emoji: '📅'
                    },
                    {
                        label: 'Community Poll',
                        description: 'Interactive poll',
                        value: 'type_poll',
                        emoji: '📊'
                    }
                ])
        );

        return { embeds: [embed], components: [row] };
    }

    // 🎯 CHANNEL SELECTOR
    static createChannelSelector(guild) {
        // Get all text and announcement channels
        const channels = Array.from(guild.channels.cache.values())
            .filter(ch => ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement)
            .sort((a, b) => a.position - b.position)
            .slice(0, 25);

        const embed = new EmbedBuilder()
            .setColor(CONFIG.COLORS.PRIMARY)
            .setTitle('📌 **SELECT TARGET CHANNEL**')
            .setDescription(`*Found ${channels.length} available channels*`)
            .setFooter({ text: 'Select where to send your announcement' });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_channel')
                .setPlaceholder('# Click to select channel...')
                .addOptions(
                    channels.map(ch => ({
                        label: ch.name.length > 25 ? ch.name.substring(0, 22) + '...' : ch.name,
                        description: `Type: ${ch.type === ChannelType.GuildAnnouncement ? 'Announcement' : 'Text'}`,
                        value: ch.id
                    }))
                )
        );

        return { embeds: [embed], components: [row] };
    }

    // ✍️ ANNOUNCEMENT EDITOR
    static createAnnouncementEditor(channel, type = 'standard') {
        const typeNames = {
            'type_standard': 'Standard Text',
            'type_embed': 'Embed Format',
            'type_emergency': 'Emergency',
            'type_event': 'Event',
            'type_poll': 'Community Poll'
        };

        const embed = new EmbedBuilder()
            .setColor(CONFIG.COLORS.SUCCESS)
            .setTitle('✍️ **WRITE YOUR ANNOUNCEMENT**')
            .setDescription(`*Type your announcement in chat*\n\n**Type:** ${typeNames[type]}\n**Channel:** ${channel}`)
            .addFields(
                {
                    name: '📝 **FORMATTING TIPS**',
                    value: '• Use **bold** for important text\n• Use *italic* for emphasis\n• Add links: [text](url)\n• Use `code` for commands',
                    inline: false
                }
            )
            .setFooter({ text: 'You have 5 minutes to type your message' });

        return { embeds: [embed], components: [] };
    }

    // 📋 ANNOUNCEMENT PREVIEW
    static createAnnouncementPreview(content, channel, type) {
        const typeNames = {
            'type_standard': 'Standard',
            'type_embed': 'Embed',
            'type_emergency': 'Emergency',
            'type_event': 'Event',
            'type_poll': 'Poll'
        };

        const embed = new EmbedBuilder()
            .setColor(CONFIG.COLORS.INFO)
            .setTitle('👁️ **ANNOUNCEMENT PREVIEW**')
            .setDescription('*Review your announcement before sending*')
            .addFields(
                {
                    name: '📊 **DETAILS**',
                    value: `**Type:** ${typeNames[type]}\n**Channel:** ${channel}\n**Length:** ${content.length} characters`,
                    inline: false
                },
                {
                    name: '📝 **CONTENT PREVIEW**',
                    value: content.length > 500 ? content.substring(0, 500) + '...' : content,
                    inline: false
                }
            );

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('preview_menu')
                .setPlaceholder('✅ Choose action...')
                .addOptions([
                    {
                        label: 'Send Announcement',
                        description: 'Send to selected channel',
                        value: 'preview_send',
                        emoji: '✅'
                    },
                    {
                        label: 'Edit Again',
                        description: 'Go back and edit',
                        value: 'preview_edit',
                        emoji: '✏️'
                    },
                    {
                        label: 'Change Type',
                        description: 'Choose different type',
                        value: 'preview_change_type',
                        emoji: '🔄'
                    },
                    {
                        label: 'Change Channel',
                        description: 'Select different channel',
                        value: 'preview_change_channel',
                        emoji: '📌'
                    },
                    {
                        label: 'Cancel',
                        description: 'Cancel announcement',
                        value: 'preview_cancel',
                        emoji: '❌'
                    }
                ])
        );

        return { embeds: [embed], components: [row] };
    }

    // 📊 LOGS VIEWER
    static createLogsViewer(logs, page = 1) {
        const itemsPerPage = 5;
        const totalPages = Math.ceil(logs.length / itemsPerPage);
        const startIdx = (page - 1) * itemsPerPage;
        const pageLogs = logs.slice(startIdx, startIdx + itemsPerPage);

        const embed = new EmbedBuilder()
            .setColor(CONFIG.COLORS.WARNING)
            .setTitle('📁 **SYSTEM LOGS**')
            .setDescription(`*Page ${page} of ${totalPages}*`)
            .addFields(
                {
                    name: '📊 **SUMMARY**',
                    value: `Total Logs: ${logs.length}\nShowing: ${pageLogs.length} logs`,
                    inline: false
                }
            );

        if (pageLogs.length > 0) {
            pageLogs.forEach((log, index) => {
                const time = new Date(log.timestamp).toLocaleTimeString('ro-RO', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                embed.addFields({
                    name: `${log.type === 'SUCCESS' ? '✅' : '❌'} ${time}`,
                    value: `**${log.action}**\n${log.details.slice(0, 100)}`,
                    inline: false
                });
            });
        }

        const options = [
            {
                label: 'Back to Main Menu',
                description: 'Return to main menu',
                value: 'logs_back',
                emoji: '🔙'
            }
        ];

        if (page > 1) {
            options.push({
                label: 'Previous Page',
                description: `Go to page ${page - 1}`,
                value: `logs_prev_${page - 1}`,
                emoji: '◀️'
            });
        }

        if (page < totalPages) {
            options.push({
                label: 'Next Page',
                description: `Go to page ${page + 1}`,
                value: `logs_next_${page + 1}`,
                emoji: '▶️'
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('logs_menu')
                .setPlaceholder('📖 Navigation...')
                .addOptions(options)
        );

        return { embeds: [embed], components: [row] };
    }

    // 📈 SERVER STATS
    static createServerStats(guild) {
        const embed = new EmbedBuilder()
            .setColor(CONFIG.COLORS.PRIMARY)
            .setTitle('📈 **SERVER STATISTICS**')
            .setDescription(`*${guild.name}*`)
            .addFields(
                {
                    name: '👥 **MEMBERS**',
                    value: `Total: ${guild.memberCount}\nOnline: ${guild.members.cache.filter(m => m.presence?.status === 'online').size}`,
                    inline: true
                },
                {
                    name: '📢 **CHANNELS**',
                    value: `Text: ${guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size}\nVoice: ${guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size}`,
                    inline: true
                },
                {
                    name: '🎭 **ROLES**',
                    value: `Total: ${guild.roles.cache.size}\nCustom: ${guild.roles.cache.filter(r => !r.managed).size}`,
                    inline: true
                },
                {
                    name: '📅 **SERVER AGE**',
                    value: `Created: ${new Date(guild.createdTimestamp).toLocaleDateString('ro-RO')}\nDays: ${Math.floor((Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24))}`,
                    inline: false
                }
            )
            .setFooter({ text: 'Wid Analytics' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('stats_menu')
                .setPlaceholder('📊 Actions...')
                .addOptions([
                    {
                        label: 'Back to Main',
                        value: 'stats_back',
                        emoji: '🔙'
                    },
                    {
                        label: 'Refresh Stats',
                        value: 'stats_refresh',
                        emoji: '🔄'
                    },
                    {
                        label: 'Export Data',
                        value: 'stats_export',
                        emoji: '📤'
                    }
                ])
        );

        return { embeds: [embed], components: [row] };
    }
}

// ======================
// 📝 LOGGING SYSTEM
// ======================
class Logger {
    static async log(action, user, details, type = 'INFO') {
        const logEntry = {
            timestamp: Date.now(),
            action,
            user,
            details,
            type
        };

        // Store in memory
        if (!client.logs.has(user)) {
            client.logs.set(user, []);
        }
        client.logs.get(user).push(logEntry);

        // Keep only last 100 logs per user
        if (client.logs.get(user).length > 100) {
            client.logs.set(user, client.logs.get(user).slice(-100));
        }

        // Send to logs channel if configured
        if (CONFIG.LOGS_CHANNEL) {
            try {
                const channel = await client.channels.fetch(CONFIG.LOGS_CHANNEL);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor(
                            type === 'SUCCESS' ? CONFIG.COLORS.SUCCESS :
                            type === 'WARNING' ? CONFIG.COLORS.WARNING :
                            type === 'ERROR' ? CONFIG.COLORS.DANGER :
                            CONFIG.COLORS.INFO
                        )
                        .setTitle(`${type === 'SUCCESS' ? '✅' : type === 'WARNING' ? '⚠️' : type === 'ERROR' ? '❌' : '📝'} ${type}`)
                        .addFields(
                            { name: 'Action', value: action, inline: true },
                            { name: 'User', value: `<@${user}>`, inline: true },
                            { name: 'Details', value: details, inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Wid Logging System' });

                    await channel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Failed to log to channel:', error);
            }
        }

        console.log(`[${new Date().toLocaleTimeString('ro-RO')}] ${type}: ${action}`);
    }
}

// ======================
// 📢 ANNOUNCEMENT SYSTEM
// ======================
class AnnouncementSystem {
    static async sendAnnouncement(channel, content, type, user) {
        try {
            let result;
            const typeMap = {
                'type_standard': 'standard',
                'type_embed': 'embed',
                'type_emergency': 'emergency',
                'type_event': 'event',
                'type_poll': 'poll'
            };
            
            const actualType = typeMap[type] || 'standard';
            
            switch(actualType) {
                case 'standard':
                    result = await channel.send(content);
                    break;
                    
                case 'embed':
                    const embed = new EmbedBuilder()
                        .setColor(CONFIG.COLORS.PRIMARY)
                        .setTitle('📢 **ANNOUNCEMENT**')
                        .setDescription(content)
                        .setTimestamp()
                        .setFooter({ text: 'Wid Community Manager' });
                    result = await channel.send({ embeds: [embed] });
                    break;
                    
                case 'emergency':
                    const emergencyEmbed = new EmbedBuilder()
                        .setColor(CONFIG.COLORS.DANGER)
                        .setTitle('🚨 **EMERGENCY**')
                        .setDescription(content)
                        .setTimestamp()
                        .setFooter({ text: 'Urgent attention required' });
                    result = await channel.send({ content: '@everyone', embeds: [emergencyEmbed] });
                    break;
                    
                case 'event':
                    const eventEmbed = new EmbedBuilder()
                        .setColor(CONFIG.COLORS.SUCCESS)
                        .setTitle('📅 **EVENT**')
                        .setDescription(content)
                        .addFields(
                            { name: 'Date', value: new Date(Date.now() + 86400000).toLocaleDateString('ro-RO'), inline: true },
                            { name: 'Time', value: '19:00', inline: true }
                        )
                        .setTimestamp();
                    result = await channel.send({ embeds: [eventEmbed] });
                    break;
                    
                case 'poll':
                    const pollEmbed = new EmbedBuilder()
                        .setColor(CONFIG.COLORS.INFO)
                        .setTitle('📊 **POLL**')
                        .setDescription(content)
                        .setFooter({ text: 'React to vote' });
                    result = await channel.send({ embeds: [pollEmbed] });
                    await result.react('✅');
                    await result.react('❌');
                    break;
            }

            await Logger.log('ANNOUNCEMENT_SENT', user, 
                `Channel: #${channel.name} | Type: ${actualType}`, 
                'SUCCESS'
            );

            return { success: true };
        } catch (error) {
            await Logger.log('ANNOUNCEMENT_FAILED', user, 
                `Error: ${error.message}`, 
                'ERROR'
            );
            return { success: false, error: error.message };
        }
    }
}

// ======================
// 🎮 EVENT HANDLERS
// ======================

// READY EVENT
client.on('ready', () => {
    console.log(`
╔══════════════════════════════════════╗
║  🌟 WID COMMUNITY MANAGER           ║
║  👤 ${client.user.tag}              ║
║  🏠 ${client.guilds.cache.size} Servers        ║
║  📢 Dropdown Menu System            ║
╚══════════════════════════════════════╝
    `);
    
    client.user.setPresence({
        activities: [{ 
            name: 'Select menu system', 
            type: 3
        }],
        status: 'online'
    });
});

// MESSAGE COMMANDS
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    // Only owner can use commands
    if (message.author.id !== CONFIG.OWNER_ID) {
        if (message.content === `${CONFIG.PREFIX}help`) {
            const embed = new EmbedBuilder()
                .setColor(CONFIG.COLORS.PRIMARY)
                .setTitle('❓ **WID BOT HELP**')
                .setDescription('Community management bot with dropdown menus.')
                .addFields(
                    { name: '👑 **Owner Commands**', value: 'Only server owner can use !wid', inline: false },
                    { name: '🎯 **Features**', value: '• Announcement creator\n• Server statistics\n• Activity logging\n• Member management', inline: false }
                )
                .setFooter({ text: 'Made with ❤️ by Wid' });
            
            return message.channel.send({ embeds: [embed] });
        }
        return;
    }

    // MAIN MENU COMMAND
    if (message.content === `${CONFIG.PREFIX}wid`) {
        return message.channel.send(WidUI.createMainDashboard(message.guild, message.author));
    }

    // QUICK ANNOUNCEMENT
    if (message.content.startsWith(`${CONFIG.PREFIX}announce `)) {
        const args = message.content.slice(9).trim().split(' ');
        const channelId = args.shift();
        const content = args.join(' ');

        try {
            const channel = await message.guild.channels.fetch(channelId);
            if (channel) {
                await channel.send(content);
                await message.reply(`✅ Announcement sent to ${channel}`);
            }
        } catch (error) {
            await message.reply(`❌ Error: ${error.message}`);
        }
    }
});

// INTERACTION HANDLER (DROPDOWN MENUS)
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    
    // Check permissions
    if (interaction.user.id !== CONFIG.OWNER_ID) {
        return interaction.reply({ 
            content: '🔒 Only the server owner can use this menu.', 
            ephemeral: true 
        });
    }

    await interaction.deferUpdate();
    const userData = client.announcements.get(interaction.user.id) || {};

    // MAIN MENU
    if (interaction.customId === 'main_menu') {
        const value = interaction.values[0];
        
        switch(value) {
            case 'menu_announce':
                await interaction.editReply(WidUI.createAnnouncementTypeMenu());
                break;
                
            case 'menu_logs':
                const allLogs = Array.from(client.logs.values()).flat();
                await interaction.editReply(WidUI.createLogsViewer(allLogs));
                break;
                
            case 'menu_stats':
                await interaction.editReply(WidUI.createServerStats(interaction.guild));
                break;
                
            case 'menu_close':
                await interaction.editReply({ components: [] });
                break;
        }
    }

    // ANNOUNCEMENT TYPE SELECTION
    else if (interaction.customId === 'announce_type') {
        userData.type = interaction.values[0];
        client.announcements.set(interaction.user.id, userData);
        await interaction.editReply(WidUI.createChannelSelector(interaction.guild));
    }

    // CHANNEL SELECTION
    else if (interaction.customId === 'select_channel') {
        const channelId = interaction.values[0];
        const channel = await interaction.guild.channels.fetch(channelId);
        
        userData.channel = channel;
        userData.channelId = channelId;
        client.announcements.set(interaction.user.id, userData);
        
        await interaction.editReply(WidUI.createAnnouncementEditor(channel, userData.type));
        
        // Wait for user to type the announcement
        const filter = m => m.author.id === interaction.user.id && !m.author.bot;
        const collector = interaction.channel.createMessageCollector({ 
            filter, 
            time: 300000,
            max: 1 
        });

        collector.on('collect', async collected => {
            userData.content = collected.content;
            client.announcements.set(interaction.user.id, userData);
            
            try {
                await collected.delete();
            } catch {}
            
            await interaction.editReply(
                WidUI.createAnnouncementPreview(collected.content, channel, userData.type)
            );
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp({ 
                    content: '⏱️ Time expired!', 
                    ephemeral: true 
                });
                client.announcements.delete(interaction.user.id);
            }
        });
    }

    // PREVIEW MENU
    else if (interaction.customId === 'preview_menu') {
        const value = interaction.values[0];
        const userData = client.announcements.get(interaction.user.id) || {};
        
        switch(value) {
            case 'preview_send':
                if (!userData.channel || !userData.content) {
                    return interaction.followUp({ 
                        content: '❌ Missing data!', 
                        ephemeral: true 
                    });
                }
                
                await interaction.editReply({ 
                    content: '🔄 Sending announcement...', 
                    components: [] 
                });
                
                const result = await AnnouncementSystem.sendAnnouncement(
                    userData.channel,
                    userData.content,
                    userData.type,
                    interaction.user.id
                );
                
                if (result.success) {
                    await interaction.editReply({ 
                        content: `✅ Announcement sent to ${userData.channel}!`, 
                        embeds: [] 
                    });
                } else {
                    await interaction.editReply({ 
                        content: `❌ Error: ${result.error}`, 
                        embeds: [] 
                    });
                }
                
                client.announcements.delete(interaction.user.id);
                break;
                
            case 'preview_edit':
                await interaction.editReply(
                    WidUI.createAnnouncementEditor(userData.channel, userData.type)
                );
                break;
                
            case 'preview_change_type':
                await interaction.editReply(WidUI.createAnnouncementTypeMenu());
                break;
                
            case 'preview_change_channel':
                await interaction.editReply(WidUI.createChannelSelector(interaction.guild));
                break;
                
            case 'preview_cancel':
                await interaction.editReply({ components: [] });
                client.announcements.delete(interaction.user.id);
                break;
        }
    }

    // LOGS MENU
    else if (interaction.customId === 'logs_menu') {
        const value = interaction.values[0];
        
        if (value === 'logs_back') {
            await interaction.editReply(WidUI.createMainDashboard(interaction.guild, interaction.user));
        } else if (value.startsWith('logs_prev_') || value.startsWith('logs_next_')) {
            const page = parseInt(value.split('_')[2]);
            const allLogs = Array.from(client.logs.values()).flat();
            await interaction.editReply(WidUI.createLogsViewer(allLogs, page));
        }
    }

    // STATS MENU
    else if (interaction.customId === 'stats_menu') {
        const value = interaction.values[0];
        
        if (value === 'stats_back') {
            await interaction.editReply(WidUI.createMainDashboard(interaction.guild, interaction.user));
        } else if (value === 'stats_refresh') {
            await interaction.editReply(WidUI.createServerStats(interaction.guild));
        }
    }
});

// ======================
// 🚀 START BOT
// ======================
client.login(CONFIG.TOKEN).then(() => {
    console.log('✅ Bot authenticated successfully!');
}).catch(error => {
    console.error('❌ Authentication failed:', error.message);
});