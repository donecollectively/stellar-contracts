import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
} from "vitest";

import {
    SampleTreasury,
    CharterDatumArgs,
    chTok,
} from "../src/examples/SampleTreasury";

import {
    Address,
    Datum,
    Value,
    Tx,
    TxOutput
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../lib/StellarTxnContext";

import {
    ADA,
    StellarTestContext, 
    StellarCapoTestHelper,
    HelperFunctions,
    addTestContext,
    mkContext,
} from "../lib/StellarTestHelper"; //HeliosTestingContext

import {
    VestingParams,
    Vesting,
} from "../src/Vesting";

const it = itWithContext<localTC>;
const describe = descrWithContext<localTC>;
const fit = it.only

class VestingTestHelper extends StellarCapoTestHelper<SampleTreasury> {
    get stellarClass() {
        return SampleTreasury;
    }
    setupActors() {
        this.addActor("sasha", 1100n * ADA);
        this.addActor("pavel", 13n * ADA);
        this.addActor("tom", 120n * ADA);
        this.currentActor = "tom";
    }

};

type localTC = StellarTestContext<SampleTreasuryTestHelper>;

describe("Vesting service", async () => {
    beforeEach<localTC>(async (context) => {
        await addTestContext(context, VestingTestHelper); //, VHelpers);
    });

	describe("baseline capabilities", () => {
	        it("gets expected wallet balances for test-scenario actor", async (context: localTC) => {
		    const {h, h: { network, actors, delay, state }} = context;
		    const { sasha, tom, pavel }  = actors;

		    const sashaMoney = await sasha.utxos;
		    const tomMoney = await tom.utxos;
		    const pavelMoney = await pavel.utxos;
		    expect(sashaMoney.length).toBe(2);
		    expect(sashaMoney[0].value.assets.nTokenTypes).toBe(0);
		    expect(sashaMoney[0].value.assets.isZero).toBeTruthy();
		    expect(sashaMoney[1].value.assets.isZero).toBeTruthy();


		    expect(sashaMoney[0].value.lovelace).toBe(1100n * ADA);
		    expect(sashaMoney[1].value.lovelace).toBe(5n * ADA);

		    expect(tomMoney[0].value.lovelace).toBe(120n * ADA);

		    expect(pavelMoney[0].value.lovelace).toBe(13n * ADA);
		});
		it("can access StellarTestHelper", async (context: localTC) => {
			const {h, h: { network, actors, delay, state }} = context;
			expect(h.currentSlot()).toBeTypeOf('bigint');
			expect(typeof(h.slotToTimestamp(h.currentSlot()))).toBe('object');
		});
		it("can access validator UTXO", async (context: localTC) => {
		    const {h, h: { network, actors, delay, state }} = context;
			const { sasha, tom, pavel } = actors;

			const v = new Vesting(context);
			const t = BigInt(Date.now());
			const deadline = t + BigInt(2*60*60*1000);

			const tcx = await v.mkTxnDepositValueForVesting({
				sponsor: sasha, 
				payee: pavel.address, //TODO: check in valUtxos
				deadline: deadline
			});

			const txId = await h.submitTx(tcx.tx, "force");

			const validatorAddress = Address.fromValidatorHash(v.compiledContract.validatorHash)
			const valUtxos = await network.getUtxos(validatorAddress)

			expect(valUtxos[0].origOutput.value.lovelace).toBeTypeOf('bigint');

		});
		it("can lock and cancel", async (context: localTC) => {
		    const {h, h: { network, actors, delay, state }} = context;
			const { sasha, tom, pavel } = actors;

			async function tryWithSlop(user: WalletEmulator ) {
				const margin = 45n * ADA;
				const firstUtxo = (await user.utxos)[0]
				const secondUtxo = (await user.utxos)[1]
				const tx = new Tx();

				tx.addInput(firstUtxo);
				tx.addInput(secondUtxo);

				tx.addOutput(new TxOutput(user.address, new Value(10n * ADA)));
				tx.addOutput(new TxOutput(user.address, new Value(10n * ADA)));
				tx.addOutput(new TxOutput(user.address, new Value(10n * ADA)));
				tx.addOutput(new TxOutput(user.address, new Value(10n * ADA)));
				tx.addOutput(
				    new TxOutput(
					user.address,
					new Value(firstUtxo.value.lovelace - margin)
				    )
				);
				// console.log("s2")
				return h.submitTx(tx, "force");
            		}

			const splitUtxo = await tryWithSlop(sasha);

			expect((await sasha.utxos).length).toBeGreaterThan(2);

			const v = new Vesting(context);
			const t = h.slotToTimestamp(h.currentSlot());
			const deadline = new Date(t.getTime() + 60*60);

			const tcx = await v.mkTxnDepositValueForVesting({
				sponsor: sasha,
				payee: pavel.address, // maybe pkh? 
				deadline: BigInt(deadline)
			});

			// Datum has time: 
			expect(JSON.parse(tcx.outputs[0].datum.data.toSchemaJson()).list[2].int).toBeTypeOf('number');

			const txId = await h.submitTx(tcx.tx, "force");

			expect((txId.hex).length).toBe(64);
			expect((await sasha.utxos).length).toBeGreaterThan(0);

			const validatorAddress = Address.fromValidatorHash(v.compiledContract.validatorHash)
			const valUtxos = await network.getUtxos(validatorAddress)

			// h.waitUntil(deadline);

			// TODO: try Date?
			const validFrom = h.slotToTimestamp(h.currentSlot() - 1n);
			const validTo = h.slotToTimestamp(h.currentSlot() + 100000n);

			const tcxCancel = await v.mkTxnCancelVesting(
				sasha, 
				valUtxos[0],
				// validFrom,
				// validTo
			);

			// expect(tcxCancel.tx.body.dump()).toBe(); // why Null? debugger shows a bigint 
			const txIdCancel = await h.submitTx(tcxCancel.tx, "force");

		});
	});
});
