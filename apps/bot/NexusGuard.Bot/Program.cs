using Discord;
using Discord.WebSocket;
using Microsoft.Extensions.Configuration;
using NexusGuard.Bot;

var config = new ConfigurationBuilder()
    .AddUserSecrets<Program>()
    .Build();

var botToken = config["Discord:BotToken"]
    ?? throw new InvalidOperationException("Discord:BotToken is not configured (set it via user-secrets).");
var apiBaseUrl = config["Api:BaseUrl"] ?? "http://localhost:5080";

var api = new ApiClient(apiBaseUrl);
var linkStore = new LinkStore();

var client = new DiscordSocketClient(new DiscordSocketConfig
{
    GatewayIntents = GatewayIntents.Guilds,
});

client.Log += message =>
{
    Console.WriteLine(message.ToString());
    return Task.CompletedTask;
};

var linkCommand = new SlashCommandBuilder()
    .WithName("nexusguard-link")
    .WithDescription("Link this Discord server to a NexusGuard server via its API key")
    .AddOption("api-key", ApplicationCommandOptionType.String, "The server's NexusGuard API key (ng_...)", isRequired: true)
    .Build();

var scanCommand = new SlashCommandBuilder()
    .WithName("nexusguard-scan")
    .WithDescription("Start a NexusGuard scan for a player and DM them the PIN")
    .AddOption("player", ApplicationCommandOptionType.User, "The Discord member to scan", isRequired: true)
    .Build();

client.Ready += async () =>
{
    Console.WriteLine($"Connected as {client.CurrentUser}. Registering commands in {client.Guilds.Count} guild(s)...");
    foreach (var guild in client.Guilds)
    {
        await RegisterCommandsAsync(guild);
    }
};

client.JoinedGuild += RegisterCommandsAsync;

client.SlashCommandExecuted += async command =>
{
    try
    {
        switch (command.Data.Name)
        {
            case "nexusguard-link":
                await HandleLinkAsync(command);
                break;
            case "nexusguard-scan":
                await HandleScanAsync(command);
                break;
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Unhandled error in {command.Data.Name}: {ex}");
    }
};

await client.LoginAsync(TokenType.Bot, botToken);
await client.StartAsync();

await Task.Delay(Timeout.Infinite);

async Task RegisterCommandsAsync(SocketGuild guild)
{
    await guild.CreateApplicationCommandAsync(linkCommand);
    await guild.CreateApplicationCommandAsync(scanCommand);
}

async Task HandleLinkAsync(SocketSlashCommand command)
{
    await command.DeferAsync(ephemeral: true);

    var apiKey = (string)command.Data.Options.First(o => o.Name == "api-key").Value;

    if (!await api.ValidateApiKeyAsync(apiKey))
    {
        await command.FollowupAsync("That API key doesn't look valid - check it and try again.", ephemeral: true);
        return;
    }

    linkStore.SetApiKey(command.GuildId!.Value, apiKey);
    await command.FollowupAsync("Linked. You can now use `/nexusguard-scan` in this server.", ephemeral: true);
}

async Task HandleScanAsync(SocketSlashCommand command)
{
    await command.DeferAsync(ephemeral: true);

    var guildId = command.GuildId;
    if (guildId is null)
    {
        await command.FollowupAsync("This command only works inside a server.", ephemeral: true);
        return;
    }

    var apiKey = linkStore.GetApiKey(guildId.Value);
    if (apiKey is null)
    {
        await command.FollowupAsync(
            "This server isn't linked yet - an admin needs to run `/nexusguard-link` first.", ephemeral: true);
        return;
    }

    var targetUser = (SocketUser)command.Data.Options.First(o => o.Name == "player").Value;

    CreateScanResult scan;
    try
    {
        scan = await api.CreateScanAsync(apiKey, targetUser.Username);
    }
    catch (Exception ex)
    {
        await command.FollowupAsync($"Could not create a scan: {ex.Message}", ephemeral: true);
        return;
    }

    var dmMessage =
        "You've been asked to run a NexusGuard scan. Open NexusGuard.Scanner.exe (ask your " +
        $"server admin for the download link if you don't have it) and enter this PIN: `{scan.Pin}`\n" +
        $"This PIN expires at {scan.PinExpiresAt:HH:mm} UTC.";

    try
    {
        var dm = await targetUser.CreateDMChannelAsync();
        await dm.SendMessageAsync(dmMessage);
        await command.FollowupAsync($"Scan started for {targetUser.Mention} - PIN sent by DM.", ephemeral: true);
    }
    catch (Exception)
    {
        await command.FollowupAsync(
            $"Scan started for {targetUser.Mention}, but I couldn't DM them (DMs may be off). " +
            $"Scan ID: `{scan.ScanId}`, PIN: `{scan.Pin}` - share it with them another way.",
            ephemeral: true);
    }
}
