export class FirebaseManager {
  constructor() {
    this.db = null;
    this.app = null;
  }

  async init(config) {
    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
      const { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      this.app = initializeApp(config);
      this.db = getFirestore(this.app);
      this.firestoreModules = { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy };
      
      return true;
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      throw error;
    }
  }

  async addGuest(guestData) {
    const { collection, addDoc } = this.firestoreModules;
    await addDoc(collection(this.db, 'guests'), guestData);
  }

  async getGuests() {
    const { collection, getDocs, query, orderBy } = this.firestoreModules;
    const q = query(collection(this.db, 'guests'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async deleteGuest(guestId) {
    const { doc, deleteDoc } = this.firestoreModules;
    await deleteDoc(doc(this.db, 'guests', guestId));
  }

  async clearAllGuests() {
    const guests = await this.getGuests();
    const { doc, deleteDoc } = this.firestoreModules;
    
    for (const guest of guests) {
      await deleteDoc(doc(this.db, 'guests', guest.id));
    }
  }
}