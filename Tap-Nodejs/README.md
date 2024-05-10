# OpenTap-Nodejs

This is the `node.js` version of OpenTap. Currently it cannot be directly install using the `npm` or `yarn` before we confirm. Nonetheless, you can find anything that useful for your project to claim. The structure of the project is shown below:

- Taproot: the basic function to build taproot transaction/address, and the RPC commend to interact with the Bitcoin network.
- MultiSig: the function that related to build multi-sig tapscript, including the single-tapleaf, multi-tapleaf and musig solution, together with a `CHECKSEQUENCEVERIFY` style escape hatch.
- Inscription: the function related to build/fetch/send/mint inscription, building in progress.

## **index.js**

currently we have organized all the function in the `index.ts` for you to simply checkout how OpenTap works. We have build a integrated demo to shown how to build multi-sig taproot address and the unlocking mechanism.

```tsx
    // Classic Multisig
    // await bridge_unit(keypair)

    // Privacy Multisig
    // await bridge_unit_mulit_leaf(keypair, 1)

    // Workflow
    // await bridge_workflow(keypair)

    // Musig
    // await start_musig_txbuilder()

    // Create a Taproot Bridge
    // await bridge_ceate_and_dump()

    // Multisig pay
    // await bridge_unlock_with_dump(1)

    // Escape hatch
    // await bridge_unlock_with_dump(2)
```

- bridge_unit: test the integrated multi-sig tapscript with single-leaf solution.
- bridge_unit_mulit_leaf: test the integrated multi-sig tapscript with multi-leaf solution
- bridge_workflow: test the complete workflow of how to build a tapscript and reedem the taproot address, especially made for understand the detail of taproot implementation.
- start_musig_txbuilder: test the integrated multi-sig tapscript with musig solution.
- bridge_create_and_dump:  create and dump the taproot setting into `.json`.
- bridge_unlock_with_dump: unlock the dumped `.json` taproot address.

## **test**

We are currently working on mocha test.