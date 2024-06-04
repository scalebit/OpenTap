import { encodeRunestone} from '@magiceden-oss/runestone-lib';

// To deploy a new rune ticker
// (this will require a commitment in an input script)
const etchingRunestone = encodeRunestone({
  etching: {
    runeName: 'THIS•IS•AN•EXAMPLE•RUNE',
    divisibility: 0,
    premine: BigInt(0),
    symbol: '',
    terms: {
      cap: BigInt(69),
      amount: BigInt(420),
      offset: {
        end: BigInt(9001),
      },
    },
    turbo: true,
  },
});
console.log(etchingRunestone)

// To mint UNCOMMON•GOODS
const mintRunestone = encodeRunestone({
  mint: {
    block: 1n,
    tx: 0,
  },
});
console.log(mintRunestone)

// Transfer 10 UNCOMMON•GOODS to output 1
const edictRunestone = encodeRunestone({
  edicts: [
    {
      id: {
        block: 1n,
        tx: 0,
      },
      amount: 10n,
      output: 1,
    },
  ],
});
console.log(edictRunestone)

// const indexer = new RunestoneIndexer();




