import { Program, UplcProgram } from "@hyperionbt/helios";

//<CT extends Program> 
export class StellarContract<
        SUB extends StellarContract<any, ParamsType>, 
        ParamsType extends Record<string, any>
> {
    //! it has configuredContract: a parameterized instance of the contract
    //  ... with specific `parameters` assigned.  
    configuredContract: Program;
    compiledContract: UplcProgram;
    
    constructor({params, isTest}: {params: ParamsType, isTest: boolean}) {
        const configured = this.configuredContract = this.contractTemplate()
        configured.parameters = params;
        const simplify = !!isTest
        this.compiledContract = configured.compile(simplify)
    }

    //! it requires an subclass to define a contractSource
    contractSource(): string | never{
        throw new Error(`missing contractSource impl`)
    };

    // static withParams(this: new () => StellarContract, params: any) : never | StellarContract {
    //     throw new Error(`subclass must implement static withParams`);
    //     // return new this(params)
    // }
    // constructor(params: any) {

    // }
    _template? : Program;
    contractTemplate() {
        return this._template = this._template ||  Program.new(this.contractSource())
    }
    

}