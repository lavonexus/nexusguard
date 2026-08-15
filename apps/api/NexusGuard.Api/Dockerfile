FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY NexusGuard.Api.csproj .
RUN dotnet restore NexusGuard.Api.csproj

COPY . .
RUN dotnet publish NexusGuard.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# dnYara.NativePack's own bundled libyara.so was built against OpenSSL 1.1, which this image's
# Debian bookworm base doesn't carry (OpenSSL 3 only) - confirmed by actually running the
# container, which failed with "libcrypto.so.1.1: cannot open shared object file". Using
# Debian's own libyara9 package instead sidesteps that entirely (built against this image's
# own OpenSSL). dnYara's DllImport("libyara") looks for an unversioned "libyara.so", which the
# distro package doesn't provide on its own (only the versioned .so.9) - the symlink covers it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libyara9 \
    && ln -s /usr/lib/x86_64-linux-gnu/libyara.so.9 /usr/lib/x86_64-linux-gnu/libyara.so \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app .
# Built for a much older YARA C ABI (2.1.0.1-era) - drop it so it can't shadow the distro's
# libyara.so this image actually resolves against.
RUN rm -f /app/libyara.so

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "NexusGuard.Api.dll"]
