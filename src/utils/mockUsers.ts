import { doc, writeBatch, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FIREBASE_COLLECTIONS } from '@/config/appConfig';

// Mock kullanıcı isimleri
const firstNames = [
  'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hasan', 'Hüseyin', 'İbrahim', 'İsmail', 'Osman', 'Süleyman',
  'Fatma', 'Ayşe', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Merve', 'Özlem', 'Selin', 'Burcu',
  'Emre', 'Burak', 'Murat', 'Kemal', 'Onur', 'Serkan', 'Tolga', 'Volkan', 'Erkan', 'Deniz',
  'Seda', 'Nazlı', 'Gizem', 'Cansu', 'Esra', 'Pınar', 'Dilara', 'Simge', 'Derya', 'Gamze',
  'Cem', 'Kaan', 'Barış', 'Tunç', 'Arda', 'Berk', 'Ege', 'Kağan', 'Alp', 'Can'
];

const lastNames = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydin', 'Özkan',
  'Kaplan', 'Doğan', 'Vural', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Arslan',
  'Kilic', 'Akın', 'Şimşek', 'Polat', 'Erdoğan', 'Güneş', 'Tekin', 'Acar', 'Karaca', 'Korkmaz',
  'Güler', 'Türk', 'Bulut', 'Dağ', 'Ayan', 'Özgür', 'Keleş', 'Bayrak', 'Sever', 'Tuncer'
];

// Rastgele isim üretici
const getRandomName = () => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { firstName, lastName };
};

// Rastgele puan üretici (0-100 arası, ama çoğu 5-50 arası olsun)
const getRandomScore = () => {
  const rand = Math.random();
  if (rand < 0.1) return 0; // %10 hiç puan yok
  if (rand < 0.3) return Math.floor(Math.random() * 10) + 1; // %20 düşük puan (1-10)
  if (rand < 0.7) return Math.floor(Math.random() * 25) + 10; // %40 orta puan (10-35)
  if (rand < 0.9) return Math.floor(Math.random() * 25) + 35; // %20 yüksek puan (35-60)
  return Math.floor(Math.random() * 40) + 60; // %10 çok yüksek puan (60-100)
};

// Rastgele tarih üretici (son 30 gün içinde)
const getRandomDate = () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
  return new Date(randomTime);
};

export const addMockUsers = async () => {
  console.log('Mock kullanıcılar ekleniyor...');
  
  let batch = writeBatch(db);
  const usersRef = collection(db, FIREBASE_COLLECTIONS.users);
  
  for (let i = 0; i < 150; i++) {
    const { firstName, lastName } = getRandomName();
    const totalWords = getRandomScore();
    const updatedAt = getRandomDate();
    
    const userDoc = doc(usersRef);
    
    batch.set(userDoc, {
      uid: userDoc.id,
      email: `test${i + 1}@wordford.com`,
      firstName,
      lastName,
      isMock: true,
      role: 'member',
      deviceId: `mock_device_${i + 1}`,
      createdAt: updatedAt,
      updatedAt,
      dailyEnergy: 20,
      dailyRevealTokens: 5,
      subscriptionTier: 'none',
      hasAdFree: false,
      totalWordsLearned: totalWords,
      totalWordsUpdatedAt: updatedAt,
      currentStreak: Math.floor(Math.random() * 10) + 1,
      longestStreak: Math.floor(Math.random() * 20) + 1,
      lastActivityDate: updatedAt,
    });
    
    // Her 50 kullanıcıda bir batch commit et (Firestore limiti)
    if ((i + 1) % 50 === 0) {
      await batch.commit();
      console.log(`${i + 1} kullanıcı eklendi...`);
      batch = writeBatch(db);
    }
  }
  
  // Kalan kullanıcıları commit et
  await batch.commit();
  console.log('✅ 150 mock kullanıcı başarıyla eklendi!');
};

export const deleteMockUsers = async () => {
  console.log('Mock kullanıcılar siliniyor...');

  const { query, where, limit, getDocs } = await import('firebase/firestore');

  const usersRef = collection(db, FIREBASE_COLLECTIONS.users);
  let totalDeleted = 0;

  const deleteInChunks = async (constraints: import('firebase/firestore').QueryConstraint[]) => {
    while (true) {
      const snapshot = await getDocs(query(usersRef, ...constraints, limit(400)));
      if (snapshot.empty) {
        break;
      }

      let batch = writeBatch(db);
      snapshot.docs.forEach((docSnap, index) => {
        batch.delete(docSnap.ref);

        if ((index + 1) % 50 === 0 && index + 1 < snapshot.size) {
          batch.commit();
          batch = writeBatch(db);
        }
      });

      await batch.commit();
      totalDeleted += snapshot.size;
    }
  };

  await deleteInChunks([where('isMock', '==', true)]);
  await deleteInChunks([where('email', '>=', 'test1@wordford.com'), where('email', '<=', 'test999@wordford.com')]);

  console.log(`✅ Toplam ${totalDeleted} mock kullanıcı silindi!`);
};