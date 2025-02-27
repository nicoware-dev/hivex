import { Address } from "../address";
import { ErrUnexpectedCondition } from "./../errors";
import { IAddress } from "./interface";
import { TransactionEvent } from "./transactionEvents";

export class TransactionLogs {
    address: IAddress = Address.empty();
    events: TransactionEvent[] = [];

    constructor(init?: Partial<TransactionLogs>) {
        Object.assign(this, init);
    }

    static fromHttpResponse(logs: any): TransactionLogs {
        let result = new TransactionLogs();
        result.address = new Address(logs.address);
        result.events = (logs.events || []).map((event: any) => TransactionEvent.fromHttpResponse(event));

        return result;
    }

    findSingleOrNoneEvent(
        identifier: string,
        predicate?: (event: TransactionEvent) => boolean,
    ): TransactionEvent | undefined {
        let events = this.findEvents(identifier, predicate);

        if (events.length > 1) {
            throw new ErrUnexpectedCondition(`more than one event of type ${identifier}`);
        }

        return events[0];
    }

    findFirstOrNoneEvent(
        identifier: string,
        predicate?: (event: TransactionEvent) => boolean,
    ): TransactionEvent | undefined {
        return this.findEvents(identifier, predicate)[0];
    }

    findEvents(identifier: string, predicate?: (event: TransactionEvent) => boolean): TransactionEvent[] {
        let events = this.events.filter((event) => event.identifier == identifier);

        if (predicate) {
            events = events.filter((event) => predicate(event));
        }

        return events;
    }
}
