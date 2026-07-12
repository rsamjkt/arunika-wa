"use client";

import { useMemo, useState } from "react";
import ApiTagGroup from "@/components/ApiTagGroup";
import type { ApiEndpointDef } from "@/components/ApiEndpoint";

interface Tag {
  tag: string;
  description: string;
  endpoints: ApiEndpointDef[];
}

const TAGS: Tag[] = [
  {
    tag: "Sesi & Perangkat",
    description: "Kelola koneksi nomor WhatsApp",
    endpoints: [
      {
        id: "sessions-list",
        method: "GET",
        path: "/api/sessions",
        summary: "Daftar semua sesi",
        description:
          "Mengembalikan semua sesi WhatsApp yang pernah dibuat beserta statusnya (STOPPED, STARTING, SCAN_QR_CODE, WORKING, FAILED).",
        example: `curl http://10.10.1.7:4000/api/sessions`,
        tryIt: { pathTemplate: "/api/sessions" },
      },
      {
        id: "sessions-create",
        method: "POST",
        path: "/api/sessions",
        summary: "Buat sesi baru",
        description:
          'Membuat sesi baru dan langsung memulainya (siap dipindai QR). Nama sesi bersifat unik dan tampil apa adanya di daftar perangkat.',
        body: [["name", 'string, wajib — nama sesi, mis. "Toko Utama"']],
        example: `curl -X POST http://10.10.1.7:4000/api/sessions \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Toko Utama"}'`,
      },
      {
        id: "sessions-get",
        method: "GET",
        path: "/api/sessions/{session}",
        summary: "Detail satu sesi",
        description: "Status terkini satu sesi, termasuk nomor yang tertaut (me.id) kalau sudah WORKING.",
        params: [["session", "nama sesi, mis. akai"]],
        tryIt: {
          pathTemplate: "/api/sessions/{session}",
          fields: [{ name: "session", placeholder: "nama sesi", defaultValue: "akai" }],
        },
      },
      {
        id: "sessions-delete",
        method: "DELETE",
        path: "/api/sessions/{session}",
        summary: "Hapus sesi",
        description:
          "Menghapus sesi secara permanen. Nomor harus dipasangkan ulang dari awal (scan QR baru) kalau ingin dipakai lagi.",
        params: [["session", "nama sesi yang akan dihapus"]],
        example: `curl -X DELETE http://10.10.1.7:4000/api/sessions/akai`,
      },
      {
        id: "sessions-start",
        method: "POST",
        path: "/api/sessions/{session}/start",
        summary: "Mulai sesi",
        description: "Memulai sesi yang sedang berhenti (STOPPED) atau gagal (FAILED).",
        params: [["session", "nama sesi"]],
        example: `curl -X POST http://10.10.1.7:4000/api/sessions/akai/start`,
      },
      {
        id: "sessions-stop",
        method: "POST",
        path: "/api/sessions/{session}/stop",
        summary: "Hentikan sesi",
        description: "Menghentikan sesi tanpa menghapus datanya — bisa dimulai lagi kapan saja tanpa scan ulang.",
        params: [["session", "nama sesi"]],
        example: `curl -X POST http://10.10.1.7:4000/api/sessions/akai/stop`,
      },
      {
        id: "sessions-restart",
        method: "POST",
        path: "/api/sessions/{session}/restart",
        summary: "Mulai ulang sesi",
        description: "Restart cepat — berguna kalau sesi terasa macet tanpa harus stop lalu start manual.",
        params: [["session", "nama sesi"]],
        example: `curl -X POST http://10.10.1.7:4000/api/sessions/akai/restart`,
      },
      {
        id: "sessions-qr",
        method: "GET",
        path: "/api/sessions/{session}/qr",
        summary: "Ambil kode QR",
        description:
          "Mengembalikan gambar PNG kode QR untuk dipindai dari WhatsApp di HP. Kode berganti tiap kali sesi belum selesai dipasangkan.",
        params: [["session", "nama sesi yang statusnya SCAN_QR_CODE"]],
        example: `curl http://10.10.1.7:4000/api/sessions/akai/qr -o qr.png`,
      },
    ],
  },
  {
    tag: "Chat & Pesan",
    description: "Baca percakapan dan riwayat pesan",
    endpoints: [
      {
        id: "chats",
        method: "GET",
        path: "/api/sessions/{session}/chats",
        summary: "Ringkasan percakapan",
        description: "Daftar chat (personal & grup) beserta pesan terakhirnya — ini yang mengisi Inbox.",
        params: [["session", "nama sesi yang sudah WORKING"]],
        tryIt: {
          pathTemplate: "/api/sessions/{session}/chats",
          fields: [{ name: "session", placeholder: "nama sesi", defaultValue: "akai" }],
        },
      },
      {
        id: "messages",
        method: "GET",
        path: "/api/sessions/{session}/messages",
        summary: "Riwayat pesan",
        description: "50 pesan terakhir dari satu chat tertentu, diurutkan dari yang terbaru.",
        params: [
          ["session", "nama sesi"],
          ["chatId", "id chat, mis. 6285776412775@c.us"],
        ],
        tryIt: {
          pathTemplate: "/api/sessions/{session}/messages",
          fields: [
            { name: "session", placeholder: "nama sesi", defaultValue: "akai" },
            { name: "chatId", placeholder: "chatId, mis. 6285776412775@c.us", query: true },
          ],
        },
      },
    ],
  },
  {
    tag: "Kirim Teks & Media",
    description: "Teks, gambar, dokumen, video, voice note, lokasi, link, kartu kontak",
    endpoints: [
      {
        id: "send-text",
        method: "POST",
        path: "/api/send-text",
        summary: "Kirim pesan teks",
        description: "Mengirim pesan teks biasa ke satu chat.",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["text", "string, wajib"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/send-text \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","text":"Halo!"}'`,
      },
      {
        id: "send-image",
        method: "POST",
        path: "/api/send-image",
        summary: "Kirim gambar",
        description: "Mengirim gambar dengan caption opsional. file: { mimetype, url } atau { mimetype, filename, data(base64) }.",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["file", "object, wajib"],
          ["caption", "string, opsional"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/send-image \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","file":{"mimetype":"image/jpeg","url":"https://picsum.photos/600"},"caption":"Contoh"}'`,
      },
      {
        id: "send-file",
        method: "POST",
        path: "/api/send-file",
        summary: "Kirim dokumen",
        description: "Mengirim file apa pun sebagai dokumen (PDF, Excel, dll).",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["file", "object, wajib"],
          ["caption", "string, opsional"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/send-file \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","file":{"mimetype":"application/pdf","filename":"invoice.pdf","url":"https://example.com/invoice.pdf"}}'`,
      },
      {
        id: "send-video",
        method: "POST",
        path: "/api/send-video",
        summary: "Kirim video",
        description: "Mengirim video dengan caption opsional (dikonversi otomatis).",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["file", "object, wajib"],
          ["caption", "string, opsional"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/send-video \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","file":{"mimetype":"video/mp4","url":"https://example.com/promo.mp4"}}'`,
      },
      {
        id: "send-voice",
        method: "POST",
        path: "/api/send-voice",
        summary: "Kirim voice note",
        description: "Mengirim audio sebagai voice note (pesan suara bulat).",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["file", "object, wajib"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/send-voice \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","file":{"mimetype":"audio/ogg","url":"https://example.com/note.ogg"}}'`,
      },
      {
        id: "send-location",
        method: "POST",
        path: "/api/send-location",
        summary: "Kirim lokasi",
        description: "Mengirim pin lokasi dengan judul.",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["latitude", "number, wajib"],
          ["longitude", "number, wajib"],
          ["title", "string, wajib"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/send-location \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","latitude":-6.2,"longitude":106.816666,"title":"Toko Utama"}'`,
      },
      {
        id: "send-link-preview",
        method: "POST",
        path: "/api/send-link-preview",
        summary: "Kirim link dengan preview",
        description: "Mengirim URL beserta kartu preview (judul, gambar).",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["url", "string, wajib"],
          ["title", "string, wajib"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/send-link-preview \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","url":"https://arunika.app","title":"Arunika · WA"}'`,
      },
      {
        id: "send-vcard",
        method: "POST",
        path: "/api/send-vcard",
        summary: "Kirim kartu kontak",
        description: "Mengirim satu atau lebih kontak dalam format vCard.",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["contacts", 'array, wajib — [{ "vcard": "BEGIN:VCARD...END:VCARD" }]'],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/send-vcard \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","contacts":[{"vcard":"BEGIN:VCARD\\nVERSION:3.0\\nFN:Gema\\nTEL:+6281234567890\\nEND:VCARD"}]}'`,
      },
    ],
  },
  {
    tag: "Aksi Pesan",
    description: "Reaksi, bintang, balas, teruskan, hapus, sematkan",
    endpoints: [
      {
        id: "reaction",
        method: "POST",
        path: "/api/message-reaction",
        summary: "Reaksi emoji",
        description: "Memberi (atau menghapus, dengan reaction kosong) reaksi emoji pada satu pesan.",
        body: [
          ["session", "string, wajib"],
          ["messageId", "string, wajib"],
          ["reaction", "string, wajib — emoji, atau string kosong untuk hapus"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/message-reaction \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","messageId":"false_...","reaction":"👍"}'`,
      },
      {
        id: "star",
        method: "POST",
        path: "/api/message-star",
        summary: "Bintangi pesan",
        description: "Menandai (atau membatalkan tanda) bintang pada satu pesan.",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["messageId", "string, wajib"],
          ["star", "boolean, wajib"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/message-star \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","messageId":"false_...","star":true}'`,
      },
      {
        id: "seen",
        method: "POST",
        path: "/api/message-seen",
        summary: "Tandai sudah dibaca",
        description: "Menandai chat sebagai sudah dibaca. Inbox memanggil ini otomatis saat membuka percakapan.",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["messageIds", "array string, opsional"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/message-seen \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us"}'`,
      },
      {
        id: "typing",
        method: "POST",
        path: "/api/message-typing",
        summary: "Indikator mengetik",
        description: 'Menampilkan/menyembunyikan status "sedang mengetik…". Inbox memanggilnya otomatis.',
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["state", '"start" atau "stop", wajib'],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/message-typing \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","state":"start"}'`,
      },
      {
        id: "reply",
        method: "POST",
        path: "/api/message-reply",
        summary: "Balas pesan (dengan kutipan)",
        description: "Mengirim teks sebagai balasan langsung ke pesan tertentu, dengan kutipan pesan asli.",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["replyTo", "string, wajib — id pesan yang dibalas"],
          ["text", "string, wajib"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/message-reply \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","replyTo":"false_...","text":"Siap kak!"}'`,
      },
      {
        id: "forward",
        method: "POST",
        path: "/api/message-forward",
        summary: "Teruskan pesan",
        description: "Meneruskan satu pesan ke chat lain.",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib — tujuan diteruskan"],
          ["messageId", "string, wajib"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/message-forward \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6281380086862@c.us","messageId":"false_..."}'`,
      },
      {
        id: "msg-delete",
        method: "POST",
        path: "/api/message-delete",
        summary: "Hapus pesan",
        description: "Menghapus pesan (hanya bisa menghapus pesan yang dikirim dari akun ini).",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["messageId", "string, wajib"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/message-delete \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","messageId":"false_..."}'`,
      },
      {
        id: "msg-pin",
        method: "POST",
        path: "/api/message-pin",
        summary: "Sematkan pesan",
        description: "Menyematkan pesan di chat untuk durasi tertentu (detik: 86400/604800/2592000).",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["messageId", "string, wajib"],
          ["duration", "number, wajib"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/message-pin \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","messageId":"false_...","duration":86400}'`,
      },
      {
        id: "msg-unpin",
        method: "POST",
        path: "/api/message-unpin",
        summary: "Lepas sematan pesan",
        description: "Melepas sematan dari pesan yang sebelumnya disematkan.",
        body: [
          ["session", "string, wajib"],
          ["chatId", "string, wajib"],
          ["messageId", "string, wajib"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/message-unpin \\\n  -H "Content-Type: application/json" \\\n  -d '{"session":"akai","chatId":"6285776412775@c.us","messageId":"false_..."}'`,
      },
    ],
  },
  {
    tag: "Kontak",
    description: "Daftar, cek nomor, blokir",
    endpoints: [
      {
        id: "contacts-list",
        method: "GET",
        path: "/api/sessions/{session}/contacts",
        summary: "Daftar semua kontak",
        description: "Semua kontak tersimpan di nomor ini.",
        params: [
          ["session", "nama sesi"],
          ["limit, offset", "query, opsional — paginasi"],
        ],
        tryIt: {
          pathTemplate: "/api/sessions/{session}/contacts",
          fields: [{ name: "session", placeholder: "nama sesi", defaultValue: "akai" }],
        },
      },
      {
        id: "contacts-check",
        method: "GET",
        path: "/api/sessions/{session}/contacts/check",
        summary: "Cek nomor terdaftar WhatsApp",
        description: "Mengecek apakah sebuah nomor telepon terdaftar di WhatsApp.",
        params: [
          ["session", "nama sesi"],
          ["phone", "query, wajib — mis. 6281234567890"],
        ],
        tryIt: {
          pathTemplate: "/api/sessions/{session}/contacts/check",
          fields: [
            { name: "session", placeholder: "nama sesi", defaultValue: "akai" },
            { name: "phone", placeholder: "62812xxxxxxx", query: true },
          ],
        },
      },
      {
        id: "contacts-detail",
        method: "GET",
        path: "/api/sessions/{session}/contacts/{id}",
        summary: "Detail kontak",
        description: 'Nama, nomor, dan info "about" satu kontak.',
        params: [
          ["session", "nama sesi"],
          ["id", "contactId, mis. 6285776412775@c.us"],
        ],
      },
      {
        id: "contacts-picture",
        method: "GET",
        path: "/api/sessions/{session}/contacts/{id}/picture",
        summary: "Foto profil kontak",
        description: "URL foto profil kontak (null kalau tidak ada / privasi disembunyikan).",
        params: [
          ["session", "nama sesi"],
          ["id", "contactId"],
        ],
      },
      {
        id: "contacts-block",
        method: "POST",
        path: "/api/sessions/{session}/contacts/block",
        summary: "Blokir / buka blokir kontak",
        description: "Blokir lewat /contacts/block, buka blokir lewat /contacts/unblock (path sama, akhiran beda).",
        body: [["contactId", "string, wajib"]],
        example: `curl -X POST http://10.10.1.7:4000/api/sessions/akai/contacts/block \\\n  -H "Content-Type: application/json" \\\n  -d '{"contactId":"6285776412775@c.us"}'`,
      },
    ],
  },
  {
    tag: "Grup",
    description: "Daftar, buat, kelola anggota",
    endpoints: [
      {
        id: "groups-list",
        method: "GET",
        path: "/api/sessions/{session}/groups",
        summary: "Daftar grup",
        description: "Semua grup yang diikuti nomor ini.",
        params: [["session", "nama sesi"]],
        tryIt: {
          pathTemplate: "/api/sessions/{session}/groups",
          fields: [{ name: "session", placeholder: "nama sesi", defaultValue: "akai" }],
        },
      },
      {
        id: "groups-create",
        method: "POST",
        path: "/api/sessions/{session}/groups",
        summary: "Buat grup baru",
        description: "Membuat grup baru dengan anggota awal.",
        body: [
          ["name", "string, wajib"],
          ["participants", 'array {id}, wajib — mis. [{"id":"6281234567890@c.us"}]'],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/sessions/akai/groups \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Grup Baru","participants":[{"id":"6281234567890@c.us"}]}'`,
      },
      {
        id: "groups-participants",
        method: "GET",
        path: "/api/sessions/{session}/groups/{id}/participants",
        summary: "Kelola anggota grup",
        description: "GET daftar anggota. POST body {participants} untuk menambah. DELETE body {participants} untuk mengeluarkan.",
        params: [
          ["session", "nama sesi"],
          ["id", "id grup, mis. 120363029613187027@g.us"],
        ],
        example: `curl -X POST http://10.10.1.7:4000/api/sessions/akai/groups/120363.../participants \\\n  -H "Content-Type: application/json" \\\n  -d '{"participants":[{"id":"6281234567890@c.us"}]}'`,
      },
      {
        id: "groups-leave",
        method: "POST",
        path: "/api/sessions/{session}/groups/{id}/leave",
        summary: "Keluar dari grup",
        description: "Keluar dari grup tanpa menghapus riwayat chat-nya.",
        params: [
          ["session", "nama sesi"],
          ["id", "id grup"],
        ],
      },
    ],
  },
  {
    tag: "Profil & Server",
    description: "Identitas akun dan info mesin",
    endpoints: [
      {
        id: "profile-get",
        method: "GET",
        path: "/api/sessions/{session}/profile",
        summary: "Profil akun WhatsApp",
        description: "Nama, status, dan foto profil nomor yang sedang login.",
        params: [["session", "nama sesi"]],
        tryIt: {
          pathTemplate: "/api/sessions/{session}/profile",
          fields: [{ name: "session", placeholder: "nama sesi", defaultValue: "akai" }],
        },
      },
      {
        id: "profile-name",
        method: "POST",
        path: "/api/sessions/{session}/profile/name",
        summary: "Ganti nama tampilan",
        description: "Mengubah nama tampilan profil WhatsApp.",
        body: [["name", "string, wajib, maks 25 karakter"]],
        example: `curl -X POST http://10.10.1.7:4000/api/sessions/akai/profile/name \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Toko Utama"}'`,
      },
      {
        id: "profile-status",
        method: "POST",
        path: "/api/sessions/{session}/profile/status",
        summary: "Ganti status/info",
        description: "Mengubah teks status (info) profil WhatsApp.",
        body: [["status", "string, wajib, maks 139 karakter"]],
        example: `curl -X POST http://10.10.1.7:4000/api/sessions/akai/profile/status \\\n  -H "Content-Type: application/json" \\\n  -d '{"status":"Fast response 08.00-21.00"}'`,
      },
      {
        id: "labels",
        method: "GET",
        path: "/api/sessions/{session}/labels",
        summary: "Label WhatsApp Business",
        description: "Daftar label yang tersedia di akun ini.",
        params: [["session", "nama sesi"]],
      },
      {
        id: "server",
        method: "GET",
        path: "/api/server",
        summary: "Info server engine",
        description: "Versi dan engine pesan yang sedang dipakai — ditampilkan di bagian atas Dashboard.",
        example: `curl http://10.10.1.7:4000/api/server`,
        tryIt: { pathTemplate: "/api/server" },
      },
    ],
  },
];

export default function DocsPage() {
  const [filter, setFilter] = useState("");

  const filteredTags = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return TAGS;
    return TAGS.map((t) => ({
      ...t,
      endpoints: t.endpoints.filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          t.tag.toLowerCase().includes(q),
      ),
    })).filter((t) => t.endpoints.length > 0);
  }, [filter]);

  const totalEndpoints = TAGS.reduce((sum, t) => sum + t.endpoints.length, 0);

  return (
    <div style={{ maxWidth: 920, margin: "0 auto 96px" }}>
      <div className="swagger-header">
        <div>
          <h1>
            Arunika·WA API<span className="ver">v1</span>
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", maxWidth: "56ch" }}>
            Lapisan API milik Arunika·WA sendiri yang meneruskan permintaan ke mesin pengirim pesan
            WhatsApp internal kami. Kredensial mesin disimpan aman di server dan tidak pernah
            keluar ke client. {totalEndpoints} endpoint di {TAGS.length} kategori.
          </p>
        </div>
        <div className="swagger-server">GET/POST http://10.10.1.7:4000</div>
      </div>

      <div className="callout warn">
        <b>Semua endpoint di sini butuh autentikasi</b>
        Ada dua cara: (1) <b>lewat browser</b> — login dulu di halaman ini (pojok kanan atas),
        cookie sesi otomatis terpakai, itu kenapa tombol &quot;Try it out&quot; di bawah langsung
        jalan tanpa setelan tambahan. (2) <b>lewat aplikasi/skrip eksternal</b> — sertakan header{" "}
        <code className="mono">X-Api-Key</code> di tiap request ke <code className="mono">/api/*</code>.
        Tanpa salah satu dari keduanya, semua endpoint balas <code className="mono">401 Unauthorized</code>.
        Buat dan kelola API key sendiri di halaman{" "}
        <a href="/settings/api-keys" style={{ color: "inherit", textDecoration: "underline" }}>
          Pengaturan → API Key
        </a>{" "}
        — jangan simpan key di kode yang publik.
      </div>

      <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: -16, marginBottom: 24 }}>
        Catatan: contoh <span className="mono">curl</span> di bawah menghilangkan header{" "}
        <span className="mono">X-Api-Key</span> supaya ringkas. Kalau memanggil dari luar browser,
        tambahkan <span className="mono">-H &quot;X-Api-Key: &lt;key-anda&gt;&quot;</span> di
        setiap request.
      </p>

      <input
        className="field swagger-filter"
        placeholder="Cari endpoint berdasarkan path, nama, atau kategori…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {filteredTags.length === 0 && (
        <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>
          Tidak ada endpoint yang cocok dengan &quot;{filter}&quot;.
        </p>
      )}

      {filteredTags.map((t) => (
        <ApiTagGroup key={t.tag} tag={t.tag} description={t.description} endpoints={t.endpoints} />
      ))}
    </div>
  );
}
