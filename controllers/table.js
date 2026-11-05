class Table {
  constructor(id) {
    this.id = id;
    this.players = []; // Websocket of the player

    Table.tables[id] = this;
  }

  static tables = {};

  addPlayer(player) {
    if (this.players.includes(player)) return false;
    else {
      this.players.push(player);
      return true;
    }
  }

  removePlayer(player) {
    if (this.players.includes(player)) {
      this.players.splice(this.players.indexOf(player), 1);
      return true;
    } else return false;
  }

  delete() {
    delete Table.tables[this.id];
  }
}

export default Table;
