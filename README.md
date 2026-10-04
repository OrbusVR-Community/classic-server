# OrbusVR Classic — Community Server

OrbusVR was the first MMO made for room-scale VR. It launched in December of 2017 after a successful 
Kickstarter campaign. This is the version of the game that existed right before the servers were shutdown
for the launch of OrbusVR: Reborn in 2019.

In the spirit of preservation and not letting a piece of history disappear, the OrbusVR team is proud
to present the OrbusVR Classic Community Edition: a free (as in beer) release of the original game client
alongside a server that you can use (and, to some degree, modify) so that you can play the game alone or
with friends at your leisure.

Read on for more information on getting started.

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Letting other players connect](#letting-other-players-connect)
- [Voice chat](#voice-chat)
- [Configuration](#configuration)
- [Modding](#modding)
- [Admin tools](#admin-tools)
- [Updating](#updating)
- [Backups](#backups)

## Requirements

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose (Docker Desktop on Windows and macOS).
- About 6 GB of disk space and 4 GB of RAM for a small group. Each zone that has players in it runs
  as its own process, so memory use grows with the number of zones in use at once.
- An x86-64 or ARM64 (Apple Silicon, Raspberry Pi 5 class) machine.

## Quick start

This gets a server running on your computer and you into the game on your home network. To let
friends join, see [Letting other players connect](#letting-other-players-connect) afterwards.

### Start the server

```sh
git clone https://github.com/orbusvr-community/classic-server.git
cd classic-server
cp config/orbus.config.example.json config/orbus.config.json
docker compose up -d
```

The first start downloads the server image (several GB) and sets up the database. When
`docker compose ps` shows `game` and `api` running, the server is ready.

To check it's answering, open `http://localhost:3000/serverinfo` in a browser on the same machine.

To stop the server: `docker compose down` (your characters are kept; see [Backups](#backups)).

### Installing the game client

OrbusVR Classic is PC VR only. Download the community edition client from the
[Releases](https://github.com/orbusvr-community/classic-server/releases) page. It's separate from the old
Steam and Oculus Store versions, which can no longer log in.

- **PC (SteamVR or Oculus, including Meta Horizon Link):** download `OrbusVR-Classic-Community-PC.zip`,
  unzip it, and run `vrclient.exe` from the unzipped folder.

The game uses the Oculus (Meta) runtime when it's installed, and SteamVR otherwise. To play through
SteamVR on a PC that also has the Meta software installed, start the game with
`vrclient.exe -vrmode OpenVR`.

It was tested using the Meta Horizon Link app to stream wireless to Meta Quest. In theory other setups should work (e.g. SteamVR),
but they were not tested.

### Connecting to your server

When the game starts, it shows a server picker. Type your server's address and choose **Connect**:

- **PC client on the same computer as the server:** `127.0.0.1`
- **A PC other than the server:** the server computer's local IP address, like `192.168.1.20`.
  To find it on the server computer:
  - **Windows:** run `ipconfig` and use the **IPv4 Address** of your network adapter.
  - **macOS:** run `ipconfig getifaddr en0` (or `en1`), or look in System Settings → Network.
  - **Linux:** run `hostname -I` and use the first address.

  If the server computer has both a wired and a Wi-Fi connection, use the wired connection's address.

The game remembers servers you've joined under **Recent Servers**. From there, create a character
and play.

If the game can't reach the server:

- Check that a firewall on the server computer allows the ports in
  [Letting other players connect](#letting-other-players-connect).
- If the server computer is on Wi-Fi, try a wired connection. Some routers block Wi-Fi devices from
  talking to each other.

## Letting other players connect

- **Same network (LAN):** players type the same local IP address you used in
  [Connecting to your server](#connecting-to-your-server), like `192.168.1.20`.
- **Over the internet:** forward these ports on your router to the server machine, then give players
  your public IP address or a hostname that points to it.

| Port | Protocol | Used for |
|---|---|---|
| 3000 | TCP | Server info, character list and character creation |
| 5000 | UDP | The game connection (ENet) |
| 8800 | TCP | The game connection when a player picks the "Websocket" connection type |

If you change `apiPort`, players add it to the address: `orbus.example.com:3100`.

### Accounts

There are no usernames or passwords. The first time a player connects, the game creates a random
identity file on their device and the server makes an account for it. Each server sees a
different login token for the same player, so no server can use a player's token on another.

Players should back up their identity file to keep their characters if they reinstall:

`%USERPROFILE%\AppData\LocalLow\Orbus Online, LLC\OrbusVR Classic\identity.dat`

If a player loses it, an admin can move their characters to their new identity — see
[Account recovery](#account-recovery).

## Voice chat

Proximity voice chat is built in: voice travels through the game connection to your server, so there's
nothing to set up and no third-party account needed.

## Configuration

Settings live in `config/orbus.config.json`. Anything you leave out uses its default. Restart the
server after changing it (`docker compose restart game api`).

| Setting | Default | What it does |
|---|---|---|
| `serverName` | `OrbusVR Community Server` | Shown to players on the character select screen. |
| `motd` | empty | A message of the day shown under the server name. |
| `allowNewAccounts` | `true` | Set to `false` to stop new players joining; existing players can still log in. |
| `maxCharacters` | `2` | Characters each account may have. |
| `clientHosts` | `1` | Connection processes. One handles a small group; add more for larger servers and publish their ports. |
| `enetBasePort` | `5000` | UDP port for the first connection process (the next uses +1, and so on). |
| `websocketBasePort` | `8800` | TCP websocket port for the first connection process. |
| `apiPort` | `3000` | Port for server info and character management. |
| `adminIps` | localhost | Addresses allowed to use the [admin tools](#admin-tools). |

If you change any ports, change them in `docker-compose.yml` to match.

## Modding

Everything in `content/` is the game's editable content, and you can change it freely (see `LICENSE`).
The server reads your copy of these folders, so edits take effect when you restart
(`docker compose restart game`):

| Folder | What's in it |
|---|---|
| `content/monsters/` | Behavior scripts for monsters and bosses: abilities, timings, phases, mechanics |
| `content/items/` | `item-serverdata.txt`: item stats and properties |
| `content/loot/` | Loot tables |
| `content/quest/`, `content/dialog/` | Quests, and the NPC conversations that offer them |
| `content/fish/` | Fishing tables |
| `content/zones/` | Per-zone settings |
| `content/world/` | Monster names |

`mods/components/` is for new server components, or replacements for existing ones by name; see
`mods/README.md`. Scripts get engine pieces with `require("orbus")`.

Some things need a matching game client and can't be added: new items,
new kinds of monsters, new zones and new visual effects. Name, icon and description changes to
existing items also won't show up on the client, but stat changes will take effect on the server itself.

## Admin tools

The admin tools only answer requests from `adminIps` (by default, the server itself), so run them
inside the server:

```sh
docker compose exec api curl -s localhost:3000/admin/<tool>
```

| Tool | What it does |
|---|---|
| `ban/<character>/<hours>` | Bans the character's account and disconnects them |
| `unban/<character>` | Lifts a ban |
| `renamecharacter/<old>/<new>` | Renames a character |
| `renamefellowship/<old>/<new>` | Renames a fellowship |
| `surname/<character>/<surname>/<force>` | Gives a character a surname (`force` 1 allows a duplicate) |
| `resetposition/<character>` | Moves a stuck character to their player house |
| `restore/<character>` | Restores a deleted character |
| `updateinventory/<character>/<itemId>` | Gives a character an item |
| `accountfor/<character>` | Shows which account a character is on |
| `rebind/<fromAccount>/<toAccount>` | Account recovery; see below |

Messages to everyone online:

```sh
docker compose exec game node orbus-server.js repl broadcast "Server restarting in 5 minutes"
```

### Account recovery

If a player lost their identity file:

1. They connect again (which makes a new, empty account) and create a temporary character, say `Tempname`.
2. Look up both accounts: `accountfor/Tempname` (their new account) and `accountfor/<their old character>`.
3. Move their new login onto the old account: `rebind/<new account>/<old account>`.

They'll see their old characters the next time they connect, plus `Tempname`, which they can delete.

## Updating

```sh
git pull
docker compose pull
docker compose up -d
```

`git pull` updates `content/`, so if you've edited it, commit your changes first and merge as usual.

## Backups

All characters and accounts are in the database volume. To back it up:

```sh
docker compose stop
docker run --rm -v classic-server_rethinkdb-data:/data -v "$PWD/backups":/backups alpine tar czf /backups/db-$(date +%F).tgz -C /data .
docker compose start
```

To restore, stop the server, then replace the volume's contents from a backup:

```sh
docker compose stop
docker run --rm -v classic-server_rethinkdb-data:/data -v "$PWD/backups":/backups alpine sh -c "rm -rf /data/* && tar xzf /backups/db-YYYY-MM-DD.tgz -C /data"
docker compose start
```

## License

See `LICENSE`. Third-party components are listed in `THIRD-PARTY-NOTICES`.

OrbusVR is not affiliated with or endorsed by Meta, Valve or Unity.
