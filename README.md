# Necromancer

Tarayıcıda oynanan, dikey ekranlı 2D pixel-art bir oyun. Necromancer, mezarlıktan yaratıklar çağırarak kutsal ordunun dalgalarına karşı savaşır.

## Nasıl çalıştırılır

Ek bir kurulum gerekmez. Oyun ES modülleri kullandığı için bir HTTP sunucusu üzerinden açılmalıdır:

```bash
python3 -m http.server 8000
```

Ardından tarayıcıda `http://localhost:8000` adresini açın. GitHub Pages üzerinde doğrudan çalışır.

## Oynanış

- **Hazırlık evresi:** Ruh Kartları açılır. Yaratık kartları çağırma yapar, ritüel kartları etki verir, lanetli kartlar dalga başında tetiklenir (ruh harcanarak arındırılabilir).
- **Savaş evresi:** Necromancer ve çağrılan yaratıklar otomatik savaşır. Düşmanlar ruh bırakır.
- Sağ kalan yaratıklar sonraki dalgaya geçer; dalga sonunda iyileşirler (Banshee varsa daha fazla).

## Teknik

- [Phaser 3](https://phaser.io) (`lib/phaser.min.js`, MIT)
- Tüm sprite'lar, normal map'ler (dinamik ışık için), kart tasarımları ve sesler kodla üretilir.
- Yazı tipleri: Cinzel (başlıklar) ve Nunito (metinler), `fonts/`, SIL Open Font License
