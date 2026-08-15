using System.Text.Json;

namespace NexusGuard.Bot;

// Maps a Discord guild to the NexusGuard server API key an admin linked via /nexusguard-link.
// Kept as a local file, not in NexusGuard's own database - the bot is just another API
// client, same as Scanner.exe and the dashboard, holding only what it needs to make calls.
public class LinkStore
{
    private readonly string _path;
    private readonly Dictionary<ulong, string> _links;

    public LinkStore(string? path = null)
    {
        _path = path ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "NexusGuard", "Bot", "links.json");

        _links = Load(_path);
    }

    public string? GetApiKey(ulong guildId) => _links.GetValueOrDefault(guildId);

    public void SetApiKey(ulong guildId, string apiKey)
    {
        _links[guildId] = apiKey;
        Save();
    }

    private static Dictionary<ulong, string> Load(string path)
    {
        if (!File.Exists(path)) return new Dictionary<ulong, string>();

        try
        {
            var json = File.ReadAllText(path);
            return JsonSerializer.Deserialize<Dictionary<ulong, string>>(json) ?? new Dictionary<ulong, string>();
        }
        catch
        {
            return new Dictionary<ulong, string>();
        }
    }

    private void Save()
    {
        var dir = Path.GetDirectoryName(_path)!;
        Directory.CreateDirectory(dir);
        File.WriteAllText(_path, JsonSerializer.Serialize(_links));
    }
}
