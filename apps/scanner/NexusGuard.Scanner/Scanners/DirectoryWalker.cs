using System.IO;

namespace NexusGuard.Scanner.Scanners;

// A manual recursive walk instead of Directory.EnumerateFiles(..., AllDirectories): the
// built-in recursive form aborts the ENTIRE enumeration the moment it hits one inaccessible
// subdirectory (extremely common under %appdata%/%programdata%), which would silently drop
// every result found before that point. This walks one directory at a time so one denied
// folder just gets skipped. Bounded by depth and total file count so a broad root (the whole
// of %localappdata%, for example) can't turn a scan into a multi-minute filesystem crawl.
public static class DirectoryWalker
{
    public static IEnumerable<string> Walk(
        string root, IReadOnlySet<string> extensions, int maxDepth, int maxFiles)
    {
        if (!Directory.Exists(root)) yield break;

        var found = 0;
        var stack = new Stack<(string Dir, int Depth)>();
        stack.Push((root, 0));

        while (stack.Count > 0 && found < maxFiles)
        {
            var (dir, depth) = stack.Pop();

            IEnumerable<string> files;
            try
            {
                files = Directory.EnumerateFiles(dir);
            }
            catch
            {
                continue; // access denied / removed mid-walk - skip this directory only
            }

            foreach (var file in files)
            {
                if (found >= maxFiles) yield break;
                var ext = Path.GetExtension(file);
                if (!extensions.Contains(ext.ToLowerInvariant())) continue;

                found++;
                yield return file;
            }

            if (depth >= maxDepth) continue;

            IEnumerable<string> subDirs;
            try
            {
                subDirs = Directory.EnumerateDirectories(dir);
            }
            catch
            {
                continue;
            }

            foreach (var sub in subDirs)
            {
                stack.Push((sub, depth + 1));
            }
        }
    }
}
