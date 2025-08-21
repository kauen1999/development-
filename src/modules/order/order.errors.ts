export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`Order with id ${id} not found`);
    this.name = "OrderNotFoundError";
  }
}

export class OrderAlreadyPaidError extends Error {
  constructor(id: string) {
    super(`Order ${id} is already paid`);
    this.name = "OrderAlreadyPaidError";
  }
}

export class OrderExpiredError extends Error {
  constructor(id: string) {
    super(`Order ${id} has expired`);
    this.name = "OrderExpiredError";
  }
}
