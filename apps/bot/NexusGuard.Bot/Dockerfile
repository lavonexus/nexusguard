FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY NexusGuard.Bot.csproj .
RUN dotnet restore NexusGuard.Bot.csproj

COPY . .
RUN dotnet publish NexusGuard.Bot.csproj -c Release -o /app --no-restore

# A console app - no Kestrel/ASP.NET surface, so the plain runtime image is enough (no need
# for mcr.microsoft.com/dotnet/aspnet like the API uses). Runs as a Render Background Worker,
# not a Web Service - it never listens on a port, it only opens an outbound WebSocket to
# Discord's gateway and stays connected.
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS final
WORKDIR /app

COPY --from=build /app .

ENTRYPOINT ["dotnet", "NexusGuard.Bot.dll"]
