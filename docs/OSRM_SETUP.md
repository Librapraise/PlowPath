# PlowPath — Self-Hosted OSRM Setup Guide

This guide walks you through setting up and maintaining a **self-hosted OSRM (Open Source Routing Machine)** server for the PlowPath production and staging environments. 

Public OSRM instances (e.g. `router.project-osrm.org`) are rate-limited and intended for fair-use only. A self-hosted OSRM server is **mandatory** for production routing and driver TSP optimization.

---

## 1. OSRM Pre-Processing Concepts

OSRM converts raw OpenStreetMap (`.osm.pbf`) data into a highly optimized static routing graph. Because of this, OSRM deployment requires a pre-processing pipeline before the server can start. This is done via three tools using the `mld` (Multi-Level Dijkstra) algorithm:

1. **`osrm-extract`**: Parses the `.osm.pbf` file and extracts the road network based on a vehicle profile (we use `/opt/car.lua` for snow removal and service trucks).
2. **`osrm-partition`**: Segments the map graph into small cells.
3. **`osrm-customize`**: Computes travel times/weights across cells based on speed limits and profiles.

---

## 2. Local Development & Testing (Windows / Docker Desktop)

Before provisioning a VPS, you can run a local OSRM instance using Docker Desktop on Windows. This is highly recommended to verify your routing logic offline without incurring costs.

> [!TIP]
> For local testing, use a small state or country extract like **Rhode Island** or **Delaware**. They download in seconds and compile in under 30 seconds, whereas New York can take 5–10 minutes.

1. **Create data directory**: Open PowerShell and create a folder on your host machine to store compiled map data:
   ```powershell
   mkdir C:\osrm-data
   cd C:\osrm-data
   ```

2. **Download a small OSM extract**:
   ```powershell
   curl -o rhode-island-latest.osm.pbf https://download.geofabrik.de/north-america/us/rhode-island-latest.osm.pbf
   ```

3. **Pre-process the map graph**:
   ```powershell
   # 1. Extract the road network
   docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/rhode-island-latest.osm.pbf

   # 2. Partition the graph
   docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/rhode-island-latest.osrm

   # 3. Customize cell weights
   docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/rhode-island-latest.osrm
   ```

4. **Start the local routing server**:
   ```powershell
   docker run -d -p 5000:5000 -v "${PWD}:/data" --name osrm-local osrm/osrm-backend osrm-routed --algorithm mld /data/rhode-island-latest.osrm
   ```

5. **Verify it works**: Open your browser and access the HTTP API:
   `http://localhost:5000/route/v1/driving/-71.4128,41.8240;-71.3085,41.4901?overview=false`

6. **Configure Local Environment**: In `backend/.env`, set:
   ```env
   OSRM_BASE_URL=http://localhost:5000
   ```

---

## 3. Production VPS Setup

For production, you should host OSRM on a dedicated VPS geographically close to your operating area (e.g. US East).

### A. VPS Requirements
* **Memory**: Minimum **4 GB RAM** (pre-processing a medium/large state can consume 2–3 GB of memory. If merging multiple states, provision at least 8 GB RAM).
* **Storage**: Minimum **20 GB SSD**.
* **Provider Recommendations**:
  * **Hetzner**: CX22 (~€5/mo, US-East or EU)
  * **DigitalOcean**: Basic 4GB droplet ($24/mo)

### B. OS & Environment Setup
SSH into your VPS and install Docker:
```bash
ssh root@your_vps_ip

# Update packages and install Docker
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y docker.io curl wget
sudo systemctl enable --now docker
```

### C. Automated Processing Script
Create `/opt/osrm/setup-osrm.sh` on the VPS to download, compile, and run the server automatically:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configurations (Update to your target state/url)
DATA_DIR="/opt/osrm/data"
MAP_URL="https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf"
PBF_FILE="new-york-latest.osm.pbf"
OSRM_FILE="new-york-latest.osrm"

mkdir -p "$DATA_DIR"
cd "$DATA_DIR"

echo "=== Downloading OSM data ==="
wget -N "$MAP_URL"

echo "=== Pre-processing road network (this may take up to 15 mins) ==="
docker run --rm -t -v "$DATA_DIR:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua "/data/$PBF_FILE"
docker run --rm -t -v "$DATA_DIR:/data" osrm/osrm-backend osrm-partition "/data/$OSRM_FILE"
docker run --rm -t -v "$DATA_DIR:/data" osrm/osrm-backend osrm-customize "/data/$OSRM_FILE"

echo "=== Starting OSRM container ==="
docker stop osrm || true
docker rm osrm || true

docker run -d \
  --name osrm \
  --restart unless-stopped \
  -p 127.0.0.1:5000:5000 \
  -v "$DATA_DIR:/data" \
  osrm/osrm-backend \
  osrm-routed --algorithm mld "/data/$OSRM_FILE"

echo "=== OSRM is now running locally on port 5000 ==="
```

Run the setup script:
```bash
chmod +x /opt/osrm/setup-osrm.sh
/opt/osrm/setup-osrm.sh
```

---

## 4. HTTPS & Reverse Proxy with Caddy

For your Fly.io backend to communicate securely with your OSRM VPS, front the OSRM container with **Caddy** to handle SSL/TLS automatically.

1. **Install Caddy**:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   ```

2. **Configure DNS**: Point a subdomain (e.g. `osrm.plowpath.app`) A-Record to your VPS IP address in your DNS manager (e.g. Cloudflare).

3. **Configure Caddyfile**: Edit `/etc/caddy/Caddyfile`:
   ```caddyfile
   osrm.plowpath.app {
       reverse_proxy localhost:5000
   }
   ```

4. **Restart Caddy**:
   ```bash
   sudo systemctl restart caddy
   ```
   Caddy will automatically request Let's Encrypt certificates and run over `https://osrm.plowpath.app`.

---

## 5. Graceful Monthly Map Updates (Zero-Downtime Reprocessing)

Road layouts and traffic rules change. You should update your OSM map extracts monthly. Since compiling map data consumes intensive CPU/RAM, doing it inside your active production folder will exhaust server resources and crash live routing queries.

To avoid downtime, use a shadow folder structure to reprocess maps off-line and swap the active database instantaneously.

Create `/opt/osrm/reprocess.sh` on the VPS:

```bash
#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="/opt/osrm/data"
SHADOW_DIR="/opt/osrm/shadow"
MAP_URL="https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf"
PBF_FILE="new-york-latest.osm.pbf"
OSRM_FILE="new-york-latest.osrm"

mkdir -p "$SHADOW_DIR"
cd "$SHADOW_DIR"

echo "=== Downloading fresh OSM map ==="
wget -q "$MAP_URL" -O "$PBF_FILE"

echo "=== Pre-processing in shadow directory ==="
docker run --rm -t -v "$SHADOW_DIR:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua "/data/$PBF_FILE"
docker run --rm -t -v "$SHADOW_DIR:/data" osrm/osrm-backend osrm-partition "/data/$OSRM_FILE"
docker run --rm -t -v "$SHADOW_DIR:/data" osrm/osrm-backend osrm-customize "/data/$OSRM_FILE"

echo "=== Swapping datasets ==="
# Stop active server
docker stop osrm || true
docker rm osrm || true

# Swap directories securely
mv "$DATA_DIR" "${DATA_DIR}_old"
mv "$SHADOW_DIR" "$DATA_DIR"
mv "${DATA_DIR}_old" "$SHADOW_DIR"

# Restart server with new dataset (downtime < 2 seconds)
docker run -d \
  --name osrm \
  --restart unless-stopped \
  -p 127.0.0.1:5000:5000 \
  -v "$DATA_DIR:/data" \
  osrm/osrm-backend \
  osrm-routed --algorithm mld "/data/$OSRM_FILE"

# Clean up old data
rm -rf "$SHADOW_DIR"/*
echo "=== OSM Data successfully updated! ==="
```

Make it executable:
```bash
chmod +x /opt/osrm/reprocess.sh
```

### Automate with a Monthly Cron
Add a cron job to update map data on the 1st of every month at 3 AM:
```bash
sudo crontab -e
```
Append the following line:
```text
0 3 1 * * /bin/bash /opt/osrm/reprocess.sh >> /var/log/osrm_update.log 2>&1
```

---

## 6. Multi-State Map Expansion

If PlowPath expands service areas beyond a single state, you must merge individual regional extracts before pre-processing.

1. Install `osmium` on the VPS or local system:
   ```bash
   sudo apt install -y osmium-tool
   ```

2. Download your state extracts:
   ```bash
   wget https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf
   wget https://download.geofabrik.de/north-america/us/new-jersey-latest.osm.pbf
   wget https://download.geofabrik.de/north-america/us/pennsylvania-latest.osm.pbf
   ```

3. Merge them into a single regional file:
   ```bash
   osmium merge new-york-latest.osm.pbf new-jersey-latest.osm.pbf pennsylvania-latest.osm.pbf -o northeast-latest.osm.pbf
   ```

4. Feed the merged file `northeast-latest.osm.pbf` into your extraction script (`setup-osrm.sh` / `reprocess.sh`).

---

## 7. Connecting the Backend
Once your self-hosted OSRM server is live, set the `OSRM_BASE_URL` secret on your Fly.io API application:

```bash
fly secrets set OSRM_BASE_URL="https://osrm.plowpath.app"
```
Verify routing by checking logs or requesting a route on the web dashboard or mobile app.
