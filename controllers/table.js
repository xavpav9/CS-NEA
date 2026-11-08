class Player {
  constructor(ws, uuid, name) {
    this.ws = ws;
    this.uuid = uuid;
    this.name = name;
  }
}

class Table {
  constructor(id) {
    this.id = id;
    this.players = []; // Websocket of the player

    Table.tables[id] = this;
  }

  static tables = {};

  addPlayer(ws, name) {
    if (this.players.map(player => player.ws).includes(ws)) return false;
    else {
      const player = new Player(ws, crypto.randomUUID(), name);
      this.players.push(player);
      return player;
    }
  }

  removePlayer(ws) {
    if (this.players.map(player => player.ws).includes(ws)) {
      this.players.splice(this.players.map(player => player.ws).indexOf(ws), 1);
      return true;
    } else return false;
  }

  getPlayer(ws) {
    const player = this.players.find(player => player.ws === ws);
    return (player) ? player : false;
  }

  delete() {
    delete Table.tables[this.id];
  }

  static getPlayers(tableID) {
    const table = Table.tables[tableID];
    return (table) ? table.players : [];
  }
}

export default Table;
