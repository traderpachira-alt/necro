# Necromancer

Tarayıcıda (telefonda da) oynanan, dikey ekranlı 2D pixel-art bir oyun. Necromancer, mezarlıktan yaratıklar çağırarak kutsal ordunun sonsuz dalgalarına karşı savaşır.

**Oyna:** https://traderpachira-alt.github.io/necro/

## Oynanış

- **Deste:** Her oyun 12 kartlık başlangıç destesiyle başlar. Her hazırlık evresinde desteden 3 kart çekilir; oynanan kartlar ve ölen yaratıkların kartları Mezarlık'a gider, deste bitince Mezarlık karıştırılıp geri döner. Dalga sonlarında 3 karttan biri desteye eklenir. Lanetler boss dalgalarında desteye karışır (ruh harcayarak arındırılabilir).
- **Elde birleştirme:** Aynı türden ve seviyeden iki kartı elde üst üste sürükle; kart kalıcı olarak seviye atlar. Aynı iki ritüel birleşince "II" sürümü oluşur.
- **Çanta:** Düşmanlardan eşya düşer (boss her zaman). Eşyalar çantadan yaratıkların ya da Necromancer'ın üstüne sürüklenerek takılır.
- **Nadirlik:** Sıradan, Nadir, Epik, Efsanevi; statları ×1 / ×1.3 / ×1.7 / ×2.2 etkiler.
- **Birleştirme:** Aynı türden ve seviyeden iki yaratığı üst üste sürükle, seviye atlasın (en fazla Sv.5). Yaratık kartı da aynı türden Sv.1 yaratığın üstüne bırakılabilir. Alan doluysa kart feda edilip ruha çevrilebilir.
- **Kemik Füzyonu:** Bu ritüel kartıyla farklı türden iki yaratık (ikisi de en az Sv.2) birleşip hibrit olur. 5 hibrit vardır; keşfedilenler Grimuar'a yazılır.
- **Savaş:** Herkes otomatik savaşır. Sağ kalanlar sonraki dalgaya geçer; dalga sonunda iyileşirler (Banshee varsa daha fazla).
- **Lütuf:** Her 2 dalgada bir 3 yükseltmeden biri seçilir (o oyun boyunca geçerli).
- **Kara Ruh:** Oyun bitince kazanılır; ana menüde kalıcı yükseltmelere ve yeni ritüel kartlarının kilidini açmaya harcanır.
- **Kayıt:** Skorlar, Grimuar ve yükseltmeler tarayıcıda saklanır. İsteğe bağlı olarak Ayarlar'dan kendi GitHub token'ınla (yalnızca `gist` izni) gizli bir gist'e yedeklenir.

## Yerelde çalıştırma

```bash
python3 -m http.server 8000
```

Ardından `http://localhost:8000` adresini açın.

## Teknik

- [Phaser 3](https://phaser.io) (`lib/phaser.min.js`, MIT)
- Tüm sprite'lar, normal map'ler (dinamik ışık için), kart tasarımları ve sesler kodla üretilir.
- Yazı tipleri: Cinzel (başlıklar) ve Nunito (metinler), `fonts/`, SIL Open Font License
