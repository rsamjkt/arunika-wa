# Menjalankan arunika-wa di Portainer

arunika-wa aslinya jalan sebagai service **systemd** (`next start -p 4000`).
Dokumen ini cara memindahkannya ke **Docker + Portainer** tanpa mengubah
integrasi WAHA/webhook dan tanpa kehilangan state di `data/`.

## Prinsip penting
- **`network_mode: host`** → app tetap dengar di `:4000`, bisa akses WAHA di
  `localhost:3000`, dan webhook WAHA ke `127.0.0.1:4000` tetap sampai. Tak perlu
  ubah `WAHA_BASE_URL` maupun URL webhook.
- **Volume `./data`** → semua state (users, konfigurasi AI, ingatan Arunika,
  session-owner, log) tersimpan di host, tidak ikut hilang saat container diganti.
- **`.env.local` & `data/` TIDAK masuk image** (di-.dockerignore). Rahasia hanya
  disuntik saat runtime via `env_file` + bind mount.

## Langkah

### 1. Bangun image di host (sekali, dan tiap kali update kode)
```sh
cd /root/arunika-wa
docker build -t arunika-wa:local .
```

### 2. Matikan service systemd (agar port 4000 bebas untuk container)
```sh
sudo systemctl disable --now arunika-wa
```

### 3. Buat Stack di Portainer
Portainer → **Stacks** → **Add stack** → **Web editor**, beri nama `arunika-wa`,
paste compose berikut (pakai path absolut + image yang sudah dibangun di langkah 1):

```yaml
services:
  arunika-wa:
    image: arunika-wa:local
    container_name: arunika-wa
    network_mode: host
    env_file:
      - /root/arunika-wa/.env.local
    volumes:
      - /root/arunika-wa/data:/app/data
    restart: unless-stopped
```

Klik **Deploy the stack**.

> Catatan: memakai path absolut (`/root/arunika-wa/...`) supaya `.env.local` &
> `data/` yang sudah ada di host tetap dipakai, apa pun direktori kerja Portainer.

### 4. Verifikasi
```sh
docker ps --filter name=arunika-wa
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000   # harap 200
```
Kirim 1 pesan WA ke nomor bot → pastikan Arunika membalas (webhook jalan).

## Update kode ke depannya
1. `git pull` (atau edit) di `/root/arunika-wa`
2. `docker build -t arunika-wa:local .`
3. Di Portainer: stack `arunika-wa` → **Update the stack** (atau `Recreate` container).

## Rollback ke systemd (kalau perlu)
```sh
docker rm -f arunika-wa
sudo systemctl enable --now arunika-wa
```

## Alternatif: WAHA sekalian di Portainer
WAHA sudah jalan sebagai container `waha` (network host). Boleh dibiarkan
apa adanya — Portainer otomatis menampilkannya di daftar Containers walau tak
dibuat lewat Stack. Tak perlu dipindah untuk arunika-wa bisa jalan.
