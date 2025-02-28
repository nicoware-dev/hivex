import { RawTransactionType } from '@multiversx/sdk-dapp/types/transactions.types';

export interface WrappingQueryResponseType {
  wrapEgld?: RawTransactionType;
  unwrapEgld?: RawTransactionType;
}
