export class DataManager {
  constructor() {
    this.storageKey = 'partyGuests';
  }

  getGuests() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  addGuest(guestData) {
    const guests = this.getGuests();
    guests.push(guestData);
    localStorage.setItem(this.storageKey, JSON.stringify(guests));
  }

  deleteGuest(guestId) {
    const guests = this.getGuests();
    const filteredGuests = guests.filter(guest => guest.id !== guestId);
    localStorage.setItem(this.storageKey, JSON.stringify(filteredGuests));
  }

  clearAllGuests() {
    localStorage.removeItem(this.storageKey);
  }
}