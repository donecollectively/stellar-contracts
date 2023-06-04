import { Program } from "@hyperionbt/helios";

//<CT extends Program> 
export abstract class StellarContract {

    //! it requires an subclass to define a contractSource
    abstract contractSource(): string;

    contractTemplate() {
        return Program.new(this.contractSource())
    }

    //! it provides a default method for creating a version of the contract,
    //  ... with specific `parameters` assigned.  
    configuredContract() {
        return this.contractTemplate();
    }

}