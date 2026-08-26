const fs = require('fs');
const path = require('path');

/**
 * Loads all command files from src/commands directory
 * @param {import('discord.js-selfbot-v13').Client} client 
 */
function loadCommands(client) {
  client.commands = new Map();
  const commandsPath = path.join(__dirname, '../commands');

  if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
  }

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);
      if (command.name) {
        client.commands.set(command.name, command);
        console.log(`[Command Loaded] $${command.name}`);
      }
    } catch (err) {
      console.error(`[Error Loading Command ${file}]`, err.message);
    }
  }
}

module.exports = { loadCommands };
