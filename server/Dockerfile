FROM mcr.microsoft.com/dotnet/sdk:8.0.425-azurelinux3.0@sha256:12e35f59799cc0261b07d09db75c3e2a3f36883469633ee7a10bb1be4094aa70 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0.31-jammy@sha256:96d23abed8e9c7d05141a7e0336a1ff2cea2c5ffcb4aa676b0fc169db421cfdf AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080

# Run the application as the non-root app user provided by the official .NET image.
USER $APP_UID

CMD ASPNETCORE_URLS=http://+:$PORT dotnet DrivingTestApi.dll
