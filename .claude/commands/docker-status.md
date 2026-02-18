# Docker Status

Check the status of Docker services required for development.

## Steps

1. Check if Docker is running: `docker ps`
2. Check if the dev compose services are up (PostgreSQL, Redis, Mailhog)
3. Check Docker compose logs for any errors if services are running
4. Report the status of each service
5. If services are down, offer to start them with `docker compose -f .docker/dev/compose.yml up -d`
