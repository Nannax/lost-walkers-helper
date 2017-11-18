const Discord = require("discord.js");
const config = require("./config.json");
const sqlite3 = require('sqlite3').verbose();
const client = new Discord.Client();

client.on("ready", () => {
    console.log(`Online su ${client.guilds.size} servers, per ${client.users.size} utenti.`);
});

client.on("message", (message) => {
    if (!message.content.startsWith(config.prefix) || message.author.bot || message.channel.name === "musica-del-bardo") return;
    if (message.channel.name !== "gmchat") {
        message.reply("Devi essere in test-bot per utilizzare i comandi.");
        message.delete();
        return;
    }
    let img_url = "";
    let tos = "sargeras";
    let antorus = "antorus";

    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    let db = new sqlite3.Database('./events.db', (err) => {
        if (err) return console.error(err.message);
        console.log("Connected to the events SQlite database.");
    });

    switch(command) {
        case "create" :
            if(args.length < 3) {
                message.reply("Numero di argomenti errato!");
                return;
            }
                
            let [date_create, hour_create, ...name_create] = args;
            if(name_create.join(" ").toLowerCase().includes(tos)) img_url = "https://i.imgur.com/cbnOjXe.jpg";
            else if(name_create.join(" ").toLowerCase().includes(antorus)) img_url = "https://i.imgur.com/EKH8uMY.jpg";
            
            db.run("CREATE TABLE IF NOT EXISTS events(date text, hour text, name text)", function(err) {
                if (err) return console.log(err.message);
                db.run("INSERT INTO events (date, hour, name) VALUES (?, ?, ?)", [date_create, hour_create, name_create.join(" ")], function(err) {
                    db.get(`select rowid, * from events where rowid = ${this.lastID}`, (err, row) => {
                        if (err) return console.log(err.message);
                        console.log(`Evento: [ID: ${row.rowid}, nome: ${row.name}, data: ${row.date}, ora: ${row.hour}]`);
                        const embed = createEmbed(row.name, message.author.username, row.date, row.hour,  row.rowid, img_url);
                        message.channel.send({embed});
                        message.reply(`Evento: [ID: ${row.rowid}, nome: ${row.name}, data: ${row.date}, ora: ${row.hour}]`);
                        for(let tmp_membs of client.guilds.get(config.lw_ID).members) {                                
                            if(tmp_membs[1].roles.some(r=>["Guild Master", "Raider", "Server Moderator"].includes(r.name)) && !tmp_membs[1].user.bot) { 
                                tmp_membs[1].send(`${tmp_membs[1].nickname} sei stato/a invitato/a al seguente evento:`);
                                tmp_membs[1].send({embed});
                            }
                        }
                    });
                });
            });

            db.close((err) => {
                if (err) return console.error(err.message);
                console.log("Closed the events database connection.");
            });
            break;

        case "update" :
            if(args.length < 4) {
                message.reply("Numero di argomenti errato!");
                return;
            }

            let [id_update, date_update, hour_update, ...name_update] = args;
            if(name_update.join(" ").toLowerCase().includes(tos)) img_url = "https://i.imgur.com/cbnOjXe.jpg";
            else if(name_update.join(" ").toLowerCase().includes(antorus)) img_url = "https://i.imgur.com/EKH8uMY.jpg";
            
            db.run("CREATE TABLE IF NOT EXISTS events(date text, hour text, name text)", function(err) {
                if (err) return console.log(err.message);
                db.run(`UPDATE events SET date = ? , hour = ?, name = ? WHERE _ROWID_ =
                ${id_update}`, [date_update, hour_update, name_update.join(" ")], function(err){
                        console.log(`Row(s) updated ${this.changes}`);
                        if (this.changes === 0) {
                            message.reply(`Evento con ID ${id_update} inesistente.`);
                            return;
                        }
                       db.get(`select rowid, * from events where rowid = ${id_update}`, (err, row) => {
                        if (err) return console.error(err.message);
                        console.log(`Evento updated: [ID: ${row.rowid}, nome: ${row.name}, data: ${row.date}, ora: ${row.hour}]`);
                        const embed = createEmbed(row.name, message.author.username, row.date, row.hour,  row.rowid, img_url);
                        message.channel.send({embed});
                        message.reply(`Evento updated: [ID: ${row.rowid}, nome: ${row.name}, data: ${row.date}, ora: ${row.hour}]`);
                        for(let tmp_membs of client.guilds.get(config.lw_ID).members) {                                
                            if(tmp_membs[1].roles.some(r=>["Guild Master", "Raider", "Server Moderator"].includes(r.name)) && !tmp_membs[1].user.bot) {  
                                tmp_membs[1].send(`${tmp_membs[1].nickname} L'evento con ID ${row.rowid} è stato modificato:`);
                                tmp_membs[1].send({embed});
                            }
                        }
                    });                  
                });
            });
            
            
            db.close((err) => {
                if (err) return console.error(err.message);
                console.log('Closed the events database connection.');
            });
            break;

        case "delete" :
            if(args.length !== 1) {
                message.reply("Numero di argomenti errato!");
                return;
            }
            
            db.run(`DELETE FROM events WHERE _rowid_= ?`, args, function(err) {
                if (err) {
                    return console.error(err.message);
                }
                console.log(`Row(s) deleted ${this.changes}`);
                if(this.changes > 0) {
                    message.reply(`Evento con ID ${args} in data ${delete_date} cancellato.`);
                    for(let tmp_membs of client.guilds.get(config.lw_ID).members) {                                
                        if(tmp_membs[1].roles.some(r=>["Guild Master", "Raider", "Server Moderator"].includes(r.name)) && !tmp_membs[1].user.bot) { 
                            tmp_membs[1].send(`${tmp_membs[1].nickname} L'evento con ID ${args}, controlla nella cronologia di che evento si tratta!`);
                        }
                    }
                } else {
                    message.reply(`Evento con ID ${args} inesistente.`);
                }
            });

            db.close((err) => {
                if (err) return console.error(err.message);
                console.log("Closed the events database connection.");
            });
            break;
    }
});

client.on("voiceStateUpdate", (oldMember, newMember) => {
    let newUserChannel = newMember.voiceChannel
    let oldUserChannel = oldMember.voiceChannel
    let newUserChannelID = newMember.voiceChannelID
    let oldUserChannelID = oldMember.voiceChannelID

    if(newUserChannel !== undefined && oldUserChannel === undefined) {
        if(newUserChannelID === config.raid_ID || newUserChannelID === config.taverna_ID) {
            console.log(`${newMember.user.username} è entrato su ${newUserChannel.name}`);
            client.channels.get(config.general_ID).send(`${newMember.user.username} è entrato.`, {
                tts: true
            });
        return;
        }
    } else if(newUserChannel === undefined){
        if(oldUserChannelID === config.raid_ID || oldUserChannelID === config.taverna_ID) {
            console.log(`${oldMember.user.username} ha lasciato ${oldUserChannel.name}`);
            client.channels.get(config.general_ID).send(`${oldMember.user.username} è uscito.`, {
                tts: true
            });
        }
    }
});

function createEmbed(name, username, date, hour,  rowid, img_url) {
    return new Discord.RichEmbed()
        .setTitle(`${name}`)
        .setAuthor(`${username}`)
        .setColor("#4283f4")
        .addField(`Data: ${date}`, "-")
        .addField(`Ora: ${hour}`, "-")
        .addField(`ID: ${rowid}`, "-")                          
        .setImage(img_url);
}

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
//client.on("debug", (e) => console.info(e));
client.login(config.token);



