// src/helios/heliosRollupLoader.ts
import { readFileSync } from "fs";
import path from "path";
import { createFilter } from "rollup-pluginutils";
function heliosRollupLoader(opts = {}) {
  const filterOpts = {
    ...{
      include: ["*.hl", "**/*.hl"],
      exclude: [],
      project: ""
    },
    ...opts
  };
  if (!filterOpts.include) {
    throw Error("missing required 'include' option for helios loader");
  }
  const filter = createFilter(
    filterOpts.include || ["*.hl", "**/*.hl"],
    filterOpts.exclude,
    {
      resolve: filterOpts.resolve
    }
  );
  const project = filterOpts.project ? `${filterOpts.project}` : "";
  let esbuildApi;
  const resolveId = (source, importer, options) => {
    const where = new Error(`here!`).stack;
    if (!filter(source)) {
      return null;
    }
    return {
      id: source
    };
  };
  return {
    name: "helios",
    resolveId,
    // the resolver hook from above
    load(id) {
      if (filter(id)) {
        const relPath = path.relative(".", id);
        const content = readFileSync(relPath, "utf-8");
        const [_, purpose, moduleName] = content.match(
          /(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m
        ) || [];
        if (!(purpose && moduleName))
          throw new Error(`Bad format for helios file ${id}`);
        const code = `const heliosModule = {
  content: ${JSON.stringify(content)},
  project: ${JSON.stringify(project)},
  purpose: ${JSON.stringify(purpose)},
  name:  ${JSON.stringify(
          relPath
        )}, // source filename
  moduleName:  ${JSON.stringify(moduleName)},
}

export default heliosModule
`;
        return {
          code,
          // id: `${id}‹generated›.ts`,
          map: { mappings: "" }
        };
      }
    }
    // buildStart({ plugins }) {
    // 	const parentName = 'esbuild';
    // 	const parentPlugin = plugins.find(
    // 		plugin => plugin.name === parentName
    // 	);
    // 	if (!parentPlugin) {
    // 		// or handle this silently if it is optional
    // 		throw new Error(
    // 			`This plugin depends on the "${parentName}" plugin.`
    // 		);
    // 	}
    // 	// now you can access the API methods in subsequent hooks
    // 	esbuildApi = parentPlugin;
    // },
  };
}

// src/helios/heliosRollupTypeGen.ts
import { blake2b } from "@helios-lang/crypto";
import { existsSync as existsSync2, mkdirSync, readFileSync as readFileSync3 } from "fs";
import path5 from "path";
import { createFilter as createFilter2 } from "rollup-pluginutils";
import {
  rollup
} from "rollup";
import esbuild from "rollup-plugin-esbuild";

// src/helios/StellarHeliosProject.ts
import { existsSync, readFileSync as readFileSync2, writeFileSync } from "fs";
import path4 from "path";

// src/helios/dataBridge/BundleTypes.ts
import { genTypes } from "@helios-lang/contract-utils";
var BundleTypes = class {
  constructor(bundle, collaborator) {
    this.bundle = bundle;
    this.collaborator = collaborator;
    this.namedTypes = {};
    const dataTypes = this.topLevelDataTypes = this.bundle.getTopLevelTypes();
    this.topLevelTypeDetails = this.gatherTopLevelTypeDetails(dataTypes);
  }
  topLevelTypeDetails;
  topLevelDataTypes;
  namedTypes = {};
  get activityTypeDetails() {
    return this.topLevelTypeDetails.redeemer;
  }
  get datumTypeDetails() {
    return this.topLevelTypeDetails.datum;
  }
  // it can begin gathering the types from the bundle's main contract
  // this has a side-effect of adding all nested named types to the context
  gatherTopLevelTypeDetails(dataTypes) {
    const { datum, redeemer, ...others } = dataTypes;
    const typeDetails = {
      datum: datum ? this.gatherTypeDetails(datum) : void 0,
      redeemer: this.gatherTypeDetails(redeemer)
    };
    for (const [typeName, dataType] of Object.entries(others)) {
      this.gatherTypeDetails(dataType);
    }
    return typeDetails;
  }
  gatherTypeDetails(type, useTypeNamesAt) {
    const schema = type.toSchema();
    if (schema.kind === "enum") {
      return this.gatherEnumDetails(type, useTypeNamesAt);
    } else {
      return this.gatherOtherTypeDetails(type, useTypeNamesAt);
    }
  }
  /**
   * type-gen interface: registers a named type in the context
   */
  registerNamedType(details) {
    const {
      //@ts-expect-error - some schemas don't have a name, but anything here does.
      typeSchema: { name },
      canonicalTypeName
    } = details;
    const useTypeName = canonicalTypeName || name;
    if (!this.namedTypes[useTypeName]) {
      this.namedTypes[useTypeName] = details;
    } else {
    }
  }
  extractModuleName(id) {
    return id.replace(/__module__(\w+)?__.*$/, "$1");
  }
  extractVariantParentName(id) {
    return id.replace(/__module__(\w+)?__(\w+)?\[\]__.*/, "$2");
  }
  gatherOtherTypeDetails(dataType, useTypeNamesAt) {
    let typeName = void 0;
    const schema = dataType.toSchema();
    if (schema.kind === "enum") {
      throw new Error(
        "must not call gatherNonEnumTypeInfo with an enum schema"
      );
    }
    if ("internal" != schema.kind && "name" in schema) {
      typeName = schema.name;
    }
    let parentNameMaybe = void 0;
    switch (schema.kind) {
      case "internal":
        break;
      case "reference":
      case "tuple":
        console.log(
          "Not registering nested types for (as-yet unsupported)",
          schema.kind
        );
        break;
      case "list":
        this.gatherTypeDetails(dataType._types[0]);
        break;
      case "map":
        this.gatherTypeDetails(dataType._types[0]);
        this.gatherTypeDetails(dataType._types[1]);
      case "option":
        this.gatherTypeDetails(dataType._types[0]);
        break;
      case "struct":
        for (const field of dataType.fieldNames) {
          this.gatherTypeDetails(
            dataType.instanceMembers[field].asDataType,
            "nestedField"
          );
        }
        break;
      case "variant":
        const vType = dataType;
        parentNameMaybe = vType.parentType.name;
        return this.gatherVariantDetails(
          vType,
          {
            module: this.extractModuleName(schema.id),
            enumName: vType.parentType.name
          }
        );
        break;
      default:
        throw new Error(`Unsupported schema kind: ${schema.kind}`);
    }
    const canonType = this.mkMinimalType("canonical", schema, void 0, parentNameMaybe);
    const ergoType = this.mkMinimalType("ergonomic", schema, void 0, parentNameMaybe);
    const details = {
      typeSchema: schema,
      typeName,
      dataType,
      canonicalType: canonType,
      ergoCanonicalType: ergoType == canonType ? typeName ? `${typeName}/*like canon-other*/` : ergoType : ergoType,
      permissiveType: this.mkMinimalType("permissive", schema, void 0, parentNameMaybe),
      moreInfo: void 0
    };
    if (typeName) {
      details.canonicalTypeName = typeName;
      details.ergoCanonicalTypeName = `Ergo${typeName}`;
      details.permissiveTypeName = `${typeName}Like`;
      this.registerNamedType(details);
      const moreInfo = schema.kind == "struct" ? this.collaborator?.getMoreStructInfo?.(details) : this.collaborator?.getMoreTypeInfo?.(details);
      if (moreInfo)
        details.moreInfo = moreInfo;
      this.collaborator?.registerNamedType?.(details);
    }
    return details;
  }
  gatherEnumDetails(enumType, useTypeNamesAt) {
    const schema = enumType.toSchema();
    const enumName = schema.name;
    const module = this.extractModuleName(schema.id);
    const variants = {};
    for (const member of schema.variantTypes) {
      const memberType = enumType.typeMembers[member.name].asEnumMemberType;
      if (!memberType) {
        throw new Error(
          `Enum member type for ${member.name} not found`
        );
      }
      variants[member.name] = this.gatherVariantDetails(
        memberType,
        { module, enumName }
      );
    }
    if (useTypeNamesAt) {
    }
    const canonType = this.mkMinimalType("canonical", schema);
    const ergoType = this.mkMinimalType("ergonomic", schema);
    const details = {
      enumName: schema.name,
      dataType: enumType,
      typeSchema: schema,
      variants,
      canonicalTypeName: `${enumName}`,
      ergoCanonicalTypeName: `Ergo${enumName}`,
      permissiveTypeName: `${enumName}Like`,
      canonicalMetaType: this.mkMinimalEnumMetaType("canonical", schema),
      permissiveMetaType: this.mkMinimalEnumMetaType(
        "permissive",
        schema
      ),
      canonicalType: canonType,
      ergoCanonicalType: ergoType == canonType ? `${enumName}/*like canon enum*/` : ergoType,
      permissiveType: this.mkMinimalType(
        "permissive",
        schema
        // XXX here, we always want to register the true type of the enum, not the type-name
        // XXX useTypeNamesAt
      ),
      moreInfo: void 0
    };
    this.registerNamedType(details);
    const moreInfo = this.collaborator?.getMoreEnumInfo?.(details);
    if (moreInfo)
      details.moreInfo = moreInfo;
    this.collaborator?.registerNamedType?.(details);
    return details;
  }
  gatherVariantDetails(variantDataType, enumId) {
    if (!variantDataType.toSchema)
      debugger;
    const schema = variantDataType.toSchema();
    if (schema.kind !== "variant") {
      throw new Error(
        "Must not call gatherVariantTypeInfo with a non-variant schema"
      );
    }
    const fieldCount = schema.fieldTypes.length;
    const fields = {};
    for (const fieldName of variantDataType.fieldNames) {
      const fieldMember = variantDataType.instanceMembers[fieldName];
      if (!fieldMember) {
        throw new Error(`Field member ${fieldName} not found`);
      }
      fields[fieldName] = this.gatherTypeDetails(fieldMember.asDataType);
    }
    const variantName = schema.name;
    const canonicalTypeName = fieldCount > 0 ? `${enumId.enumName}$${variantName}` : "tagOnly";
    const permissiveTypeName = fieldCount > 0 ? `${enumId.enumName}$${variantName}Like` : "tagOnly";
    const canonType = this.mkMinimalType(
      "canonical",
      schema,
      void 0,
      enumId.enumName
    );
    const ergoType = this.mkMinimalType(
      "ergonomic",
      schema,
      void 0,
      enumId.enumName
    );
    const details = {
      fields,
      fieldCount,
      variantName,
      typeSchema: schema,
      dataType: variantDataType,
      canonicalTypeName,
      ergoCanonicalTypeName: `${enumId.enumName}$Ergo$${variantName}`,
      permissiveTypeName,
      canonicalType: canonType,
      ergoCanonicalType: ergoType == canonType ? `${enumId.enumName}$${variantName}/*ergo like-canonical-this-variant*/` : ergoType,
      permissiveType: this.mkMinimalType(
        "permissive",
        schema,
        void 0,
        enumId.enumName
      ),
      canonicalMetaType: this.mkMinimalVariantMetaType(
        "canonical",
        schema,
        enumId
      ),
      //, "nestedField"),
      permissiveMetaType: this.mkMinimalVariantMetaType(
        "permissive",
        schema,
        enumId
      ),
      //, "nestedField"),
      moreInfo: void 0
    };
    if (this.collaborator) {
      const moreInfo = this.collaborator.getMoreVariantInfo?.(details);
      details.moreInfo = moreInfo;
    }
    if (fieldCount == 1) {
    }
    if (fieldCount > 1) {
      this.registerNamedType(details);
      this.collaborator?.registerNamedType?.(details);
    }
    return details;
  }
  mkMinimalType(typeVariety, schema, useTypeNamesAt, parentName) {
    const varietyIndex = typeVariety === "permissive" ? 1 : 0;
    let name = schema.name;
    let nameLikeOrName = name;
    let $nameLike = name ? `${name}Like` : void 0;
    switch (schema.kind) {
      case "internal":
        return genTypes(schema)[varietyIndex];
      case "reference":
        throw new Error("References are not yet supported");
      case "tuple":
        throw new Error("Tuples are not yet supported");
      case "list":
        return `Array<${this.mkMinimalType(
          typeVariety,
          schema.itemType,
          "nestedField"
        )}>`;
      case "map":
        return `Map<${this.mkMinimalType(
          typeVariety,
          schema.keyType,
          "nestedField"
        )}, ${this.mkMinimalType(
          typeVariety,
          schema.valueType,
          "nestedField"
        )}>`;
      case "option":
        return `${this.mkMinimalType(
          typeVariety,
          schema.someType,
          useTypeNamesAt
        )} | undefined`;
      case "struct":
        if (typeVariety === "permissive") {
          nameLikeOrName = $nameLike;
        } else if (typeVariety === "ergonomic") {
          nameLikeOrName = `Ergo${name}`;
        }
        if (useTypeNamesAt)
          return nameLikeOrName;
        return `{
${schema.fieldTypes.map(
          (field) => `    ${field.name}: /*minStructField*/ ${this.mkMinimalType(
            typeVariety,
            field.type,
            "nestedField"
          )}`
        ).join("\n")}
}
`;
      case "enum":
        if (typeVariety === "permissive") {
          nameLikeOrName = $nameLike;
        } else if (typeVariety === "ergonomic") {
          nameLikeOrName = `Ergo${name}`;
        }
        if (useTypeNamesAt)
          return nameLikeOrName;
        const module = this.extractModuleName(schema.id);
        const enumId = { module, enumName: name };
        return schema.variantTypes.map((variant) => {
          return `
        | { ${variant.name}: ${this.mkMinimalType(
            typeVariety,
            variant,
            "nestedField",
            enumId.enumName
          )} /*minEnumVariant*/ }`;
        }).join("") + "\n";
      case "variant":
        if (!parentName) {
          parentName = this.extractVariantParentName(schema.id);
        }
        const variantInfo = this.mkMinimalVariantType(
          schema,
          typeVariety,
          parentName
        );
        if (variantInfo === "tagOnly")
          return variantInfo;
        if (Array.isArray(variantInfo)) {
          const fullVariantName = `${parentName}$${name}`;
          if (typeVariety === "permissive") {
            nameLikeOrName = `${parentName}$${$nameLike}`;
          } else if (typeVariety === "ergonomic") {
            nameLikeOrName = `${parentName}$Ergo$${name}`;
          } else {
            nameLikeOrName = fullVariantName;
          }
          if (useTypeNamesAt)
            return nameLikeOrName;
          return `{${variantInfo.join(`,`)}
}
`;
        } else {
          return `/* implied wrapper { ${schema.fieldTypes[0].name}: ... } for singleVariantField */ 
			${variantInfo}   `;
        }
      default:
        throw new Error(`Unsupported schema kind: ${schema.kind}`);
    }
  }
  mkMinimalEnumMetaType(typeVariety, schema) {
    const name = schema.name;
    const module = this.extractModuleName(schema.id);
    const enumId = { module, enumName: name };
    const $enumId = `{module: "${enumId.module}", enumName: "${enumId.enumName}"}`;
    return `EnumTypeMeta<
    ${$enumId}, {
${schema.variantTypes.map((variantSchema) => {
      return `        ${variantSchema.name}: ${this.mkMinimalVariantMetaType(
        typeVariety,
        variantSchema,
        enumId
        // "nestedField"
      )}`;
    }).join(",\n")}
    }
>;
`;
  }
  mkMinimalVariantMetaType(typeVariety, schema, enumId) {
    let variantName = schema.name;
    const variantFlavor = this.variantFlavor(schema);
    const $nlindent = "\n" + " ".repeat(12);
    const $nloutdent = "\n" + " ".repeat(8);
    let quotedFlavor = "fields" === variantFlavor ? `${$nlindent}"${variantFlavor}"` : `"${variantFlavor}"`;
    const fieldDefs = this.mkMinimalType(
      typeVariety,
      schema,
      "nestedField",
      enumId.enumName
    );
    const specialFlags = [];
    if (schema.fieldTypes[0]?.name === "seed") {
      specialFlags.push(`"isSeededActivity"`);
    }
    const $specialFlags = specialFlags.join(" | ") || `"noSpecialFlags"`;
    const minimalVariantSrc = `singleEnumVariantMeta<${enumId.enumName}Meta, "${variantName}",${$nlindent}"Constr#${schema.tag}", ${quotedFlavor}, ${fieldDefs}, ${$specialFlags}${$nloutdent}>`;
    return minimalVariantSrc;
  }
  variantFlavor(schema) {
    switch (schema.fieldTypes.length) {
      case 0:
        return "tagOnly";
      case 1:
        return "singletonField";
      default:
        return "fields";
    }
  }
  mkMinimalVariantType(schema, typeVariety, parentName) {
    const $nlindent = "\n" + " ".repeat(4);
    const variantFlavor = this.variantFlavor(schema);
    switch (variantFlavor) {
      case "tagOnly":
        return "tagOnly";
      case "singletonField":
        return this.mkMinimalType(
          typeVariety,
          schema.fieldTypes[0].type,
          "nestedField"
        );
      case "fields":
        return schema.fieldTypes.map(
          (field) => `${$nlindent}${field.name}: ${this.mkMinimalType(
            typeVariety,
            field.type,
            "nestedField"
          )}  /*minVariantField*/ `
        );
      default:
        throw new Error(
          `Incomplete switch or invalid variant flavor: ${variantFlavor}`
        );
    }
  }
};

// src/helios/dataBridge/BundleBasedGenerator.ts
import path2 from "path";
var CREATED = Symbol("withCreate");
var BundleBasedGenerator = class {
  bundle;
  typeBundle;
  /**
   * ## Don't use this constructor directly!
   * For proper initialization, you must use `‹class›.create(bundle)`, not `new ‹class›(bundle)`
   */
  constructor(bundle, isBrandedCreate) {
    if (isBrandedCreate !== CREATED) {
      throw new Error(`Invalid use of \`new ${this.constructor.name}.new(bundle)\`
  ... use \`${this.constructor.name}.create(bundle)\` instead`);
    }
    this.bundle = bundle;
  }
  /**
   * provides delayed iniitalization of the BundleTypes
   */
  static create(bundle) {
    const item = new this(bundle, CREATED);
    item.initTypeBundle();
    return item;
  }
  initTypeBundle() {
    this.typeBundle = new BundleTypes(this.bundle, this);
  }
  get namedTypes() {
    return this.typeBundle.namedTypes;
  }
  get topLevelTypeDetails() {
    return this.typeBundle.topLevelTypeDetails;
  }
  get activityTypeDetails() {
    return this.typeBundle.activityTypeDetails;
  }
  get datumTypeDetails() {
    return this.typeBundle.datumTypeDetails;
  }
  /**
   * internal use for modifying imports for .hlb*.[tj]s that are part of the stellar contracts library
   * if it is true, then the imports will be expressed in a way relative to the stellar contracts 
   * repository.  Otherwise, all the stellar contracts types will be imported from the
   * \`\@donecollectively\/stellar-contracts\` package.
   */
  _isSC = false;
  _isInStellarContractsLib(t) {
    this._isSC = true;
  }
  /**
   * computes relative path from inputFile to importFile
   */
  mkRelativeImport(inputFile, importFile) {
    let relativePath = path2.relative(
      path2.dirname(inputFile),
      path2.join(importFile)
    );
    if (relativePath[0] !== ".") {
      relativePath = `./${relativePath}`;
    }
    return relativePath;
  }
  get datumTypeName() {
    return this.bundle.effectiveDatumTypeName();
  }
};

// src/helios/dataBridge/BundleTypeGenerator.ts
var BundleTypeGenerator = class extends BundleBasedGenerator {
  createAllTypesSource(className, parentClassName, inputFile) {
    let stellarImports = `        
import type {
    CapoHeliosBundle,
    CapoDelegateBundle,
    minimalData,
    HeliosScriptBundle,
    EnumTypeMeta,
    singleEnumVariantMeta,
    tagOnly,
    IntersectedEnum
} from "@donecollectively/stellar-contracts"
`;
    if (this._isSC) {
      stellarImports = `
import {HeliosScriptBundle} from "${this.mkRelativeImport(
        inputFile,
        "src/helios/HeliosScriptBundle.js"
      )}"
import type { 
    tagOnly, 
    EnumTypeMeta, 
    singleEnumVariantMeta
} from "${this.mkRelativeImport(
        inputFile,
        "src/helios/HeliosMetaTypes.js"
      )}"
import type { minimalData } from "${this.mkRelativeImport(
        inputFile,
        "src/delegation/DelegatedData.js"
      )}"
import type { IntersectedEnum } from "${this.mkRelativeImport(
        inputFile,
        "src/helios/typeUtils.js"
      )}"
                
`;
    }
    return `// generated by StellarHeliosProject using Stellar heliosRollupTypeGen()
// recommended: CHECK THIS FILE INTO YOUR VERSION CONTROL SYSTEM
//   ... and keep checking in the changes as your on-chain types evolve.
//
// NOTE: this file is auto-generated; do not edit directly

import type { UplcData } from "@helios-lang/uplc";
import type {
    Address,
    AssetClass,
    DatumHash,
    MintingPolicyHash,
    PubKey,
    PubKeyHash,
    ScriptHash,
    SpendingCredential,
    StakingCredential,
    StakingValidatorHash,
    TimeRange,
    TxId,
    TxInput,
    TxOutput,
    TxOutputId,
    InlineTxOutputDatum,
    ValidatorHash,
    Value,
} from "@helios-lang/ledger";
import type { Cast } from "@helios-lang/contract-utils";
import type { 
    IntLike,
    // BytesLike,
 } from "@helios-lang/codec-utils";

 type TimeLike = IntLike;
 
${stellarImports}

${this.generateNamedDependencyTypes()}
`;
  }
  generateNamedDependencyTypes() {
    return Object.entries(this.namedTypes).map(([name, typeInfo]) => {
      if (typeInfo.typeSchema.kind === "enum") {
        return this.generateEnumTypeSource(
          name,
          typeInfo
        );
      } else {
        return this.generateOtherNamedTypeSource(
          name,
          typeInfo
        );
      }
    }).join("\n");
  }
  generateEnumTypeSource(name, typeInfo) {
    return `export type ${name}Meta = ${typeInfo.canonicalMetaType}

/**
 * ${name} enum variants
 * 
 * @remarks - expresses the essential raw data structures
 * supporting the **${Object.keys(typeInfo.variants).length} variant(s)** of the ${name} enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level \`${name}Helper\` class
 *     for generating UPLC data for this enum type
 */
export type ${name} = ${typeInfo.canonicalType}
export type ${typeInfo.ergoCanonicalTypeName} = IntersectedEnum<${typeInfo.ergoCanonicalType}>

/**
 * ${name} enum variants (permissive)
 * 
 * @remarks - expresses the allowable data structure
 * for creating any of the **${Object.keys(typeInfo.variants).length} variant(s)** of the ${name} enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level \`${name}Helper\` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are 
 * converted by convention to the canonical types used in the on-chain context.
 */
export type ${name}Like = IntersectedEnum<${typeInfo.permissiveType}>
`;
  }
  generateOtherNamedTypeSource(name, typeInfo) {
    if (!typeInfo.ergoCanonicalTypeName)
      throw new Error("missing ergoCanonicalTypeName");
    if (!typeInfo.permissiveTypeName)
      throw new Error("missing permissiveTypeName");
    const schema = typeInfo.typeSchema;
    const minimalTypeInfo = schema.kind === "struct" && !!schema.fieldTypes.find((f) => f.name === "id" && f.type.kind == "internal" && f.type.name == "ByteArray") && !!schema.fieldTypes.find((f) => f.name === "type" && f.type.kind == "internal" && f.type.name == "String") ? `export type minimal${typeInfo.canonicalTypeName} = minimalData<${typeInfo.permissiveTypeName}>` : "";
    return `export type ${typeInfo.canonicalTypeName || name} = ${typeInfo.canonicalType}
export type ${typeInfo.ergoCanonicalTypeName} = ${typeInfo.ergoCanonicalType}
export type ${typeInfo.permissiveTypeName} = ${typeInfo.permissiveType}
` + minimalTypeInfo;
  }
  // // redeemer is write-only
  // generateRedeemerApiTypes() {
  //     return this.generateWriteApiTypes(
  //         this.topLevelTypeDetails.redeemer,
  //         "Activity"
  //     );
  // }
  // // datums are read/write, when present
  // generateDatumApiTypes() {
  //     // datum: HeliosTypeInfo | HeliosEnumInfo) {
  //     if (!this.topLevelTypeDetails.datum) {
  //         return `// no datum types in this script`;
  //     }
  //     return (
  //         this.generateWriteApiTypes(
  //             this.topLevelTypeDetails.datum,
  //             "mkDatum"
  //         ) +
  //         this.generateReadApiTypes(
  //             this.topLevelTypeDetails.datum,
  //             "readDatum"
  //         )
  //     );
  //     // mkDatum: {
  //     //     placeholder: "generate proxy types here";
  //     // }
  //     // readDatum: {
  //     //     placeholder: "show proxy types here";
  //     // }
  // }
  // generateWriteApiTypes(typeInfo: anyTypeDetails, accessorName?: string) {
  //     if (!accessorName) {
  //         //@ts-expect-error - name not always present
  //         if (!typeInfo.typeSchema.name) {
  //             throw new Error("typeName must be provided for unnamed types");
  //         }
  //         //@ts-expect-error - name already guarded above
  //         accessorName = `mk${typeInfo.typeSchema.name}`;
  //     }
  //     const isActivity = "Activity" == accessorName ? "Activity" : "";
  //     if (typeInfo.typeSchema.kind === "enum") {
  //         return `    ${accessorName}: makesUplc${isActivity}EnumData<${typeInfo.typeSchema.name}Like>;\n`;
  //     }
  //     //@ts-expect-error - name not always present
  //     if (typeInfo.typeSchema.name) {
  //         //@ts-expect-error - name already guarded above
  //         return `    ${accessorName}: uplcDataMaker<${typeInfo.typeSchema.name}Like>;\n`;
  //     } else {
  //         console.log(
  //             " ????????? is non-named uplcDataMaker ever used?\nyes:" +
  //                 new Error("").stack!.split("\n").splice(2).join("\n")
  //         );
  //         return `    ${accessorName}: uplcDataMaker<${typeInfo.permissiveType}>;\n`;
  //     }
  // }
  // generateReadApiTypes(typeInfo: anyTypeDetails, accessorName?: string) {
  //     if (!accessorName) {
  //         //@ts-expect-error - name not always present
  //         if (!typeInfo.typeSchema.name) {
  //             throw new Error("typeName must be provided for unnamed types");
  //         }
  //         //@ts-expect-error - name already guarded above
  //         accessorName = `read${typeInfo.typeSchema.name}`;
  //     }
  //     if (typeInfo.typeSchema.kind === "enum") {
  //         return `    ${accessorName}: readsUplcEnumData<${typeInfo.typeSchema.name}>;\n`;
  //     }
  //     //@ts-expect-error - name not always present
  //     if (typeInfo.typeSchema.name) {
  //         //@ts-expect-error - name already guarded above
  //         return `    ${accessorName}: readsUplcData<${typeInfo.typeSchema.name}>;\n`;
  //     }
  //     return `    ${accessorName}: readsUplcData<${typeInfo.canonicalType}>;\n`;
  // }
};

// src/helios/dataBridge/dataBridgeGenerator.ts
import path3 from "path";
var dataBridgeGenerator = class extends BundleBasedGenerator {
  namedSchemas = {};
  // satisfies TypeGenHooks<dataBridgeTypeInfo> for creating more details for an enum type
  getMoreEnumInfo(typeDetails) {
    const enumName = typeDetails.enumName;
    const helperClassName = `${enumName}Helper`;
    this.namedSchemas[enumName] = typeDetails.typeSchema;
    return {
      accessorCode: `get ${enumName}() {
                return new ${helperClassName}();
            }`,
      helperClassName
    };
  }
  getMoreStructInfo(typeDetails) {
    const structName = typeDetails.typeName;
    const castMemberName = `\u1C7A\u1C7A${structName}Cast`;
    const helperClassName = `${structName}Helper`;
    this.namedSchemas[structName] = typeDetails.typeSchema;
    return {
      castCode: `
                 /*unused?*/ ${castMemberName}: Cast<${structName}Like, ${structName}> 
                    = makeCast<${structName}Like, ${structName}>(
                        this.schema.${structName}, 
                        { isMainnet: true, unwrapSingleFieldEnumVariants: true }
                    );
            `,
      accessorCode: `${structName}(fields: ${structName}Like}) {
                throw new Error("hey, this isn't actually unused!");
                
                return this.${castMemberName}.toUplcData(fields);
            }`,
      helperClassName
    };
  }
  getMoreVariantInfo(details) {
    return {};
  }
  getMoreTypeInfo(details) {
    return {};
  }
  // creates a class providing an interface for creating each type of data relevent
  // for a contract script, with an 'activity' accessor for creating redeemer data,
  // a 'datum' accessor well-typed on-chain datum, and any utility functions defined
  // in on-chain scripts.
  // Any of these that are enums will have their own helper classes for creating
  //  the enum's specific variants.
  generateDataBridge(inputFile, projectName) {
    const { bridgeClassName } = this.bundle;
    let imports = (
      /*-----------------imports---------------*/
      `
import { makeCast, type Cast } from "@helios-lang/contract-utils"
import type { UplcData, ConstrData } from "@helios-lang/uplc";
import type { 
    IntLike,
 } from "@helios-lang/codec-utils";
import type {
    Address,
    AssetClass,
    DatumHash,
    MintingPolicyHash,
    PubKey,
    PubKeyHash,
    ScriptHash,
    SpendingCredential,
    StakingCredential,
    StakingValidatorHash,
    TimeRange,
    TxId,
    TxInput,
    TxOutput,
    TxOutputId,
    ValidatorHash,
    Value,
} from "@helios-lang/ledger";
 import { makeInlineTxOutputDatum, type InlineTxOutputDatum, type TxOutputDatum } from "@helios-lang/ledger";
import type { EnumTypeSchema, StructTypeSchema } from "@helios-lang/type-utils";

`
    );
    let scImports = (
      /*--------------stellar-contracts-imports --------------*/
      `import {
    ContractDataBridge,
    DataBridge, 
    DataBridgeReaderClass ,
    EnumBridge,
    impliedSeedActivityMaker,
    type tagOnly, 
    type hasSeed, 
    type isActivity, 
    type funcWithImpliedSeed,
    type SeedAttrs,
    type JustAnEnum,
    type callWith,
    type IntersectedEnum,
} from "@donecollectively/stellar-contracts"
`
    );
    if (this._isSC) {
      scImports = `import { 
    DataBridge, 
    ContractDataBridge, 
    DataBridgeReaderClass,
    type callWith,
} from "${this.mkRelativeImport(
        inputFile,
        "src/helios/dataBridge/DataBridge.js"
      )}"
import { 
    EnumBridge,
    type JustAnEnum,
} from "${this.mkRelativeImport(
        inputFile,
        "src/helios/dataBridge/EnumBridge.js"
      )}"
import type { tagOnly } from "${this.mkRelativeImport(
        inputFile,
        "src/helios/HeliosMetaTypes.js"
      )}"
import type { IntersectedEnum } from "${this.mkRelativeImport(
        inputFile,
        "src/helios/typeUtils.js"
      )}"
import { 
    impliedSeedActivityMaker, SeedActivity, type hasSeed, type isActivity, 
    type funcWithImpliedSeed, type SeedAttrs
} from "${this.mkRelativeImport(
        inputFile,
        "src/ActivityTypes.js"
      )}"
`;
    }
    return (
      /* --------------overall file format----------------*/
      `// generated by Stellar Contracts dataBridgeGenerator
// based on types defined in ${this.bundle.program.name} (${this.bundle.main.name})
// recommended: CHECK THIS FILE INTO YOUR VERSION CONTROL SYSTEM
//   ... and keep checking in the changes as your on-chain types evolve.
//
// NOTE: this file is auto-generated; do not edit directly
${imports}
${scImports}
export type TimeLike = IntLike;

${this.includeScriptNamedTypes(inputFile)}

/**
 * GENERATED data bridge for **${this.bundle.program.name}** script (defined in class ***${this.bundle.constructor.name}***)
 * main: **${this.bundle.main.name}**, project: **${this.bundle.main.project || "\u2039local proj\u203A"}**
 * @remarks - note that you may override \`get dataBridgeName() { return "..." }\` to customize the name of this bridge class
* @public
 */
export class ${bridgeClassName} extends ContractDataBridge {
    static isAbstract = false as const;
    isAbstract = false as const;
${this.includeDatumAccessors()}
${this.includeActivityCreator()}
${this.includeDataReaderHelper()}
${this.includeTypeAccessors()}
${this.includeUtilityFunctions()}
}
export default ${bridgeClassName};
${this.gatherHelperClasses()}
${this.includeAllHelperClasses()}
${this.includeNamedSchemas()}
// }
`
    );
  }
  includeCastMemberInitializers() {
    return Object.values(this.additionalCastMemberDefs).join("");
  }
  includeDataReaderHelper() {
    const readerClassName = `${this.bundle.bridgeClassName}Reader`;
    this.helperClasses[readerClassName] = this.generateDataReaderClass(readerClassName);
    return `    reader = new ${readerClassName}(this);
`;
  }
  generateDataReaderClass(className) {
    return `/*
 * @public
 */
export class ${className} extends DataBridgeReaderClass {
    constructor(public bridge: ${this.bundle.bridgeClassName}) {
        super();
    }
${this.includeEnumReaders()}
${this.includeStructReaders()}
}
`;
  }
  includeEnumReaders() {
    return Object.keys(this.typeBundle.namedTypes).filter((typeName) => {
      const typeDetails = this.typeBundle.namedTypes[typeName];
      return typeDetails.typeSchema.kind === "enum";
    }).map((typeName) => {
      const typeDetails = this.typeBundle.namedTypes[typeName];
      const helperClassName = typeDetails.moreInfo.helperClassName;
      const isDatum = this.datumTypeName === typeName;
      const generateFunc = (
        /* -------------enum-reader-func--------------*/
        `    /**
        * reads UplcData *known to fit the **${typeName}*** enum type,
        * for the ${this.bundle.program.name} script.
        * ### Standard WARNING
        * 
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        * 
        * Used correctly with data that matches the enum type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        * 
        * On the other hand, reading non-matching data will not give you a valid result.  
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    ${typeName}(d : UplcData) { 
        const typeHelper = this.bridge.types.${typeName};
        const cast = typeHelper.\u1C7A\u1C7Acast;  

        return cast.fromUplcData(d) as Ergo${typeName};        
    } /* enumReader helper */
`
      );
      if (isDatum) {
        return `datum = (d: UplcData) => { return this.${typeName}(d) }
` + generateFunc;
      }
      return generateFunc;
    }).join("\n");
  }
  includeStructReaders() {
    return Object.keys(this.typeBundle.namedTypes).filter((typeName) => {
      const typeDetails = this.typeBundle.namedTypes[typeName];
      return typeDetails.typeSchema.kind === "struct";
    }).map((typeName) => {
      const typeDetails = this.typeBundle.namedTypes[typeName];
      const castMemberName = `\u1C7A\u1C7A${typeName}Cast`;
      const isDatum = this.datumTypeName === typeName;
      const func = (
        /*-------------struct-reader-func--------------*/
        `    /**
        * reads UplcData *known to fit the **${typeName}*** struct type,
        * for the ${this.bundle.program.name} script.
        * ### Standard WARNING
        * 
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        * 
        * Used correctly with data that matches the type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        * 
        * On the other hand, reading non-matching data will not give you a valid result.  
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    ${typeName}(d: UplcData) {
        const cast = this.bridge.${castMemberName};
        return cast.fromUplcData(d) //??? as Ergo${typeName};
    } /* structReader helper */
`
      );
      if (isDatum) {
        return `datum = (d: UplcData) => { return this.${typeName}(d) }
` + func;
      }
      return func;
    }).join("\n");
  }
  additionalCastMemberDefs = {};
  includeTypeAccessors() {
    return `    /**
     * accessors for all the types defined in the \`${this.bundle.program.name}\` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types = {
` + this.includeEnumTypeAccessors() + `

` + this.includeStructTypeAccessors() + `    }    

` + this.includeCastMemberInitializers();
  }
  includeEnumTypeAccessors() {
    const accessors = Object.keys(this.typeBundle.namedTypes).filter((typeName) => {
      const typeDetails = this.typeBundle.namedTypes[typeName];
      return typeDetails.typeSchema.kind === "enum";
    }).map((typeName) => {
      const typeDetails = this.typeBundle.namedTypes[typeName];
      const helperClassName = typeDetails.moreInfo.helperClassName;
      return `      /**
       * generates UplcData for the enum type ***${typeName}*** for the \`${this.bundle.program.name}\` script
       */
        ${typeName}: new ${helperClassName}(),`;
    }).join("\n");
    return accessors;
  }
  // emits accessors for all the struct types defined in the bundle
  // for inclusion in the bridge's 'types' namespace
  // gathers Cast initializers to include in the bridge class
  includeStructTypeAccessors() {
    const accessors = Object.keys(this.typeBundle.namedTypes).filter((typeName) => {
      const typeDetails = this.typeBundle.namedTypes[typeName];
      return typeDetails.typeSchema.kind === "struct";
    }).map((typeName) => {
      const typeDetails = this.typeBundle.namedTypes[typeName];
      const {
        canonicalTypeName,
        permissiveType,
        permissiveTypeName
      } = typeDetails;
      const castMemberName = `\u1C7A\u1C7A${typeName}Cast`;
      this.additionalCastMemberDefs[castMemberName] = `    /**
                * uses unicode U+1c7a - sorts to the end */
    ${castMemberName} = makeCast<${canonicalTypeName}, ${permissiveTypeName}>(
        ${typeName}Schema,
        { isMainnet: true, unwrapSingleFieldEnumVariants: true }
    );
`;
      return `      /**
       * generates UplcData for the enum type ***${typeName}*** for the \`${this.bundle.program.name}\` script
       */
        ${typeName}: (fields: ${permissiveTypeName} | ${permissiveType}) => {
        return this.${castMemberName}.toUplcData(fields);
    },`;
    }).join("\n");
    return accessors;
  }
  includeUtilityFunctions() {
    return ``;
  }
  includeScriptNamedTypes(inputFile) {
    const typeFile = inputFile.replace(/\.bridge.ts$/, ".typeInfo.js");
    let relativeTypeFile = path3.relative(path3.dirname(inputFile), typeFile);
    if (relativeTypeFile[0] !== ".") {
      relativeTypeFile = `./${relativeTypeFile}`;
    }
    return `
import type {
${Object.entries(this.typeBundle.namedTypes).map(
      ([
        typeName,
        {
          canonicalTypeName,
          ergoCanonicalTypeName,
          permissiveTypeName
        }
      ]) => {
        return `    ${[
          canonicalTypeName,
          ergoCanonicalTypeName,
          permissiveTypeName
        ].filter((x) => !!x).join(", ")}`;
      }
    ).join(",\n")}
} from "${relativeTypeFile}";

export type * as types from "${relativeTypeFile}";
import type * as types from "${relativeTypeFile}";

`;
  }
  includeActivityCreator() {
    const activityDetails = this.activityTypeDetails;
    if (!activityDetails) {
      throw new Error(
        `${this.bundle.constructor.name}: missing required activity type`
      );
    }
    let schemaName = "";
    let activityName;
    switch (activityDetails.typeSchema.kind) {
      case "enum":
        activityName = activityDetails.typeSchema.name;
        schemaName = `${activityName}Schema`;
        break;
      case "variant":
        activityName = activityDetails.typeSchema.name;
        schemaName = `${activityName}Schema`;
        break;
      case "struct":
        activityName = activityDetails.typeSchema.name;
        schemaName = `${activityName}Schema`;
        break;
      default:
        schemaName = JSON.stringify(activityDetails.typeSchema);
    }
    const canonicalType = activityDetails.canonicalTypeName || activityDetails.canonicalType;
    const permissiveType = activityDetails.permissiveTypeName || activityDetails.permissiveType;
    const activityTypeName = activityDetails.canonicalTypeName;
    const castDef = `
    \u1C7A\u1C7AactivityCast = makeCast<
        ${canonicalType}, ${permissiveType}
    >(${schemaName}, { 
        isMainnet: true,
        unwrapSingleFieldEnumVariants: true
    }); // activityAccessorCast`;
    if (activityDetails.typeSchema.kind === "enum") {
      const helperClassName = `${activityName}Helper`;
      return `
    /**
     * generates UplcData for the activity type (***${activityTypeName}***) for the \`${this.bundle.program.name}\` script
     */
    activity : ${helperClassName}= new ${helperClassName}({isActivity: true}); // activityAccessor/enum
        ${activityName}: ${helperClassName} = this.activity;
`;
    } else if (activityDetails.typeSchema.kind === "struct") {
      return `${castDef}

    /**
     * generates UplcData for the activity type (***${activityTypeName}***) for the \`${this.bundle.program.name}\` script
     * @remarks - same as {@link activity}
     */
    ${activityTypeName}(fields: ${activityTypeName}Like) {
        return this.\u1C7A\u1C7AactivityCast.toUplcData(fields);
    }

`;
    } else {
      const permissiveTypeInfo = `${activityDetails.permissiveType}`;
      const helperClassName = `OtherActivityTypeHelper`;
      const helperClassType = `callWith<${permissiveTypeInfo}, ${helperClassName}>`;
      const helperClassTypeCast = "as any";
      const helperClass = this.mkOtherDataHelperClass(
        helperClassName,
        activityDetails
      );
      this.helperClasses[helperClassName] = helperClass;
      const moreTypeGuidance = (
        /*------------*/
        `
     * 
     * This accessor object is callable with the indicated argument-type
     * @example - contract.mkDatum(arg: /* ... see the indicated callWith args \\*\\/)\\n`
      );
      const accessorVarietyAnnotation = ` // activityAccessor/other
`;
      return `    /**
     * Helper class for generating TxOutputDatum for the ***activity type ${activityTypeName ? `(${activityTypeName})` : ""}***
     * ("redeemer" type) for this \`${this.bundle.program.name}\` contract script. ${moreTypeGuidance}
     */
    activity: ${helperClassType}
     = new ${helperClassName}({}) ${helperClassTypeCast} ` + accessorVarietyAnnotation;
    }
  }
  includeDatumAccessors() {
    const datumDetails = this.datumTypeDetails;
    if (!datumDetails) {
      this.datumTypeDetails;
      return `datum = undefined // no datum type defined for this bundle (minter / rewards script)
`;
    }
    if (datumDetails.typeSchema.kind === "variant") {
      throw new Error(`Datum as specific enum-variant not yet supported`);
    }
    let typeNameAccessor = "";
    let helperClassName = "";
    let helperClassType = "";
    let datumTypeName = this.datumTypeName;
    const typeName = ("canonicalTypeName" in datumDetails ? datumDetails.canonicalTypeName : "") || datumDetails.canonicalType;
    const permissiveTypeName = ("permissiveTypeName" in datumDetails ? datumDetails.permissiveTypeName : "") || datumDetails.permissiveType;
    let moreTypeGuidance = "";
    let helperClassTypeCast = "";
    let datumAccessorVarietyAnnotation = "";
    if (datumDetails.typeSchema.kind === "enum") {
      const d = datumDetails;
      const {
        moreInfo: { helperClassName: hCN }
      } = d;
      if (!hCN)
        throw new Error(
          `missing helperClassName for enum ${d.enumName}`
        );
      helperClassName = hCN;
      helperClassType = hCN;
      typeNameAccessor = `
    /**
     * this is the specific type of datum for the \`${this.bundle.program.name}\` script
     */
    ${datumDetails.typeSchema.name}: ${helperClassType} = this.datum;`;
      datumAccessorVarietyAnnotation = ` // datumAccessor/enum
`;
    } else if (datumDetails.typeSchema.kind === "struct") {
      const d = datumDetails;
      const {
        moreInfo: { helperClassName: hCN }
      } = d;
      if (!hCN)
        throw new Error(
          `missing helperClassName for struct ${d.typeName}`
        );
      helperClassName = hCN;
      const permissiveTypeInfo = `${d.permissiveTypeName} | ${d.permissiveType}`;
      helperClassType = `callWith<${permissiveTypeInfo}, ${hCN}>`;
      helperClassTypeCast = "as any";
      moreTypeGuidance = `
     * 
     * This accessor object is callable with the indicated argument-type
     * @example - contract.mkDatum(arg: /* ... see the indicated callWith args \\*\\/)
    *
    * ${permissiveTypeName} is the same as the expanded type details given
`;
      typeNameAccessor = `

    /**
     * this is the specific type of datum for the \`${this.bundle.program.name}\` script
     * normally, we suggest accessing the \`datum\` property instead.
     */
    ${datumDetails.typeSchema.name}: ${helperClassType} = this.datum;`;
      datumAccessorVarietyAnnotation = ` // datumAccessor/struct
`;
    } else {
      const permissiveTypeInfo = `${datumDetails.permissiveType}`;
      helperClassName = `OtherDatumTypeHelper`;
      helperClassType = `callWith<${permissiveTypeInfo}, ${helperClassName}>`;
      helperClassTypeCast = "as any";
      this.helperClasses[helperClassName] = this.mkOtherDataHelperClass(
        helperClassName,
        datumDetails
      );
      moreTypeGuidance = `
     * 
     * This accessor object is callable with the indicated argument-type
     * @example - contract.mkDatum(arg: /* ... see the indicated callWith args \\*\\/)\\n`;
      datumAccessorVarietyAnnotation = ` // datumAccessor/other
`;
    }
    return `    /**
     * Helper class for generating TxOutputDatum for the ***datum type ${datumTypeName ? `(${datumTypeName})` : ""}***
     * for this contract script. ${moreTypeGuidance}
     */
    datum: ${helperClassType}
     = new ${helperClassName}({}) ${helperClassTypeCast} ` + datumAccessorVarietyAnnotation + typeNameAccessor + `

    readDatum : (d: UplcData) => Ergo${typeName} = (d) =>  {
        return this.reader.${typeName}(d)
    }
`;
  }
  mkOtherDataHelperClass(helperClassName, details) {
    const typeName = ("canonicalTypeName" in details ? details.canonicalTypeName : "") || details.canonicalType;
    const permissiveTypeName = ("permissiveTypeName" in details ? details.permissiveTypeName : "") || details.permissiveType;
    if (details.typeSchema.kind != "internal" && (typeName || permissiveTypeName)) {
      throw new Error(
        `type name (${typeName}) and permissive type name (${permissiveTypeName}) are NOT expected for an other-data-type accessor (schema kind=${details.typeSchema.kind})`
      );
    }
    const { canonicalType, permissiveType, typeSchema } = details;
    const castDef = `    /**
        * uses unicode U+1c7a - sorts to the end */
    \u1C7A\u1C7Acast = makeCast<
        ${canonicalType}, ${permissiveType}
    >(
        ${JSON.stringify(typeSchema)}, 
        { isMainnet: true, unwrapSingleFieldEnumVariants: true }
    ); // datumAccessorCast
`;
    return `export class ${helperClassName} extends DataBridge {
    isCallable = true
    ${castDef}
    
    } // mkOtherDatumHelperClass
    `;
  }
  helperClasses = {};
  // iterate all the named types, generating helper classes for each
  gatherHelperClasses() {
    const classSources = [];
    for (const [name, typeDetails] of Object.entries(
      this.typeBundle.namedTypes
    )) {
      if (typeDetails.typeSchema.kind === "enum") {
        const enumDetails = typeDetails;
        this.helperClasses[name] = this.mkEnumHelperClass(enumDetails);
      } else if (typeDetails.typeSchema.kind === "struct") {
        const structDetails = typeDetails;
        this.helperClasses[name] = this.mkStructHelperClass(structDetails);
      }
    }
    return "";
  }
  includeAllHelperClasses() {
    return Object.values(this.helperClasses).join("\n");
  }
  get redeemerTypeName() {
    return this.activityTypeDetails.dataType.name;
  }
  nestedHelperClassName(typeDetails, isActivity) {
    let helperClassName = typeDetails.moreInfo.helperClassName;
    if (isActivity && !helperClassName?.match(/Activit/)) {
      helperClassName = `Activity${helperClassName}`;
    }
    return `${helperClassName}Nested`;
  }
  mkStructHelperClass(typeDetails) {
    const structName = typeDetails.typeName;
    return `/**
 * Helper class for generating UplcData for the struct ***${structName}*** type.
 * @public
 */
export class ${structName}Helper extends DataBridge {
    isCallable = true
   /**
            * uses unicode U+1c7a - sorts to the end */
    \u1C7A\u1C7Acast = makeCast<${typeDetails.canonicalTypeName}, ${typeDetails.permissiveTypeName}>(
        ${structName}Schema,
        { isMainnet: true, unwrapSingleFieldEnumVariants: true }
    );

    // You might expect a function as follows.  We provide this interface and result, 
    // using a proxy in the inheritance chain.
    // see the callableDataBridge type on the 'datum' property in the contract bridge.
    //
    //Also: if you're reading this, ask in our discord server about a \u{1F381} for curiosity-seekers! 
    //
    // ${structName}(fields: ${typeDetails.permissiveTypeName}) {
    //    return this.\u1C7A\u1C7Acast.toUplcData(fields);
    //}
} //mkStructHelperClass 

`;
  }
  mkEnumHelperClass(typeDetails, isActivity = this.redeemerTypeName === typeDetails.enumName, isNested) {
    const enumName = typeDetails.enumName;
    const isDatum = this.datumTypeName === enumName;
    const parentClass = isActivity ? `EnumBridge<isActivity>` : `EnumBridge<JustAnEnum>`;
    const normalType = isDatum ? "InlineTxOutputDatum" : "UplcData";
    const helperClassName = isNested ? this.nestedHelperClassName(typeDetails, isActivity) : typeDetails.moreInfo.helperClassName;
    return `/**
 * Helper class for generating ${normalType} for variants of the ***${enumName}*** enum type.
 * @public
 */
export class ${helperClassName} extends ${parentClass} {
    /*mkEnumHelperClass*/
    /**
            *  uses unicode U+1c7a - sorts to the end */
    \u1C7A\u1C7Acast = makeCast<${typeDetails.canonicalTypeName}, ${typeDetails.permissiveTypeName}>(
        ${enumName}Schema,
        { isMainnet: true, unwrapSingleFieldEnumVariants: true }
    );

` + this.mkEnumVariantAccessors(
      typeDetails,
      isDatum,
      isActivity,
      isNested
    ) + `
}/*mkEnumHelperClass*/

`;
  }
  mkNestedEnumAccessor(enumTypeDetails, variantDetails, variantName, fieldName, oneField, isInActivity) {
    const enumName = enumTypeDetails.enumName;
    const isActivity = isInActivity || this.redeemerTypeName === enumName;
    const enumPathExpr = this.getEnumPathExpr(variantDetails);
    const nestedEnumDetails = oneField.typeSchema;
    const nestedEnumName = nestedEnumDetails.name;
    const nestedEnumField = oneField;
    const nestedHelperClassName = this.nestedHelperClassName(
      nestedEnumField,
      isActivity
    );
    const nestedHelper = this.mkEnumHelperClass(
      nestedEnumField,
      isActivity,
      "isNested"
    );
    this.helperClasses[nestedHelperClassName] = nestedHelper;
    const nestedFieldName = fieldName;
    return `    /**
     * access to different variants of the ***nested ${nestedEnumName}*** type needed for ***${enumName}:${variantName}***.
     */
    get ${variantName}() {
        const nestedAccessor = new ${nestedHelperClassName}({
            isNested: true, isActivity: ${isActivity ? "true" : "false"} 
        });
        ${"//"}@ts-expect-error drilling through the protected accessor.  See more comments about that above
        nestedAccessor.mkDataVia(
            (${nestedFieldName}: ${nestedEnumName}Like) => {
                return  this.mkUplcData({ ${variantName}: ${nestedFieldName} }, 
            ${enumPathExpr});
        });
        return nestedAccessor;
    } /* nested enum accessor */`;
  }
  getEnumPathExpr(variantDetails, quoted = true) {
    const { parentType } = variantDetails.dataType.asEnumMemberType;
    const enumName = variantDetails.dataType.asEnumMemberType?.parentType.name;
    const [_1, _module, moduleName, _enumPlusBracket] = parentType.path.split("__");
    return JSON.stringify(
      `${moduleName}::${enumName}.${variantDetails.variantName}`
    );
  }
  mkEnumVariantAccessors(enumDetails, isDatum, isActivity, isNested) {
    const accessors = Object.keys(enumDetails.variants).map((variantName) => {
      const variantDetails = enumDetails.variants[variantName];
      const fieldCount = variantDetails.fieldCount;
      const normalType = isDatum ? "InlineTxOutputDatum" : "UplcData";
      if (fieldCount === 0) {
        const enumPathExpr = this.getEnumPathExpr(variantDetails);
        return `/**
 * (property getter): ${normalType} for ***${enumPathExpr}***
 * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#${variantDetails.typeSchema.tag}***
 */
    get ${variantName}() {
        const uplc = this.mkUplcData({ ${variantName}: {} }, 
            ${enumPathExpr});
` + (isDatum ? `        return makeInlineTxOutputDatum(uplc);
` : `        return uplc;
`) + `    } /* tagOnly variant accessor */`;
      } else if (fieldCount === 1) {
        return this.mkSingleFieldVariantAccessor(
          enumDetails,
          variantDetails,
          variantName,
          isDatum,
          isActivity,
          isNested
        );
      } else {
        return this.mkMultiFieldVariantAccessor(
          enumDetails,
          variantDetails,
          variantName,
          isDatum,
          isActivity,
          isNested
        );
      }
    }).join("\n\n");
    return accessors;
  }
  mkMultiFieldVariantAccessor(enumTypeDetails, variantDetails, variantName, isDatum = this.datumTypeName === enumTypeDetails.enumName, isActivity = this.redeemerTypeName === enumTypeDetails.enumName, isNested) {
    function mkFieldType(fieldName, indent = 2) {
      const oneField = variantDetails.fields[fieldName];
      let thatType = oneField.permissiveType;
      if ("permissiveTypeName" in oneField) {
        thatType = oneField.permissiveTypeName;
      }
      return `    `.repeat(indent) + `${fieldName}: ${thatType}`.trimEnd();
    }
    function unfilteredFields(indent = 2) {
      return Object.keys(variantDetails.fields).map((x) => mkFieldType(x, indent)).join(",\n");
    }
    const { permissiveTypeName } = variantDetails;
    const enumPathExpr = this.getEnumPathExpr(variantDetails);
    const returnType = isActivity ? "isActivity" : isDatum ? `InlineTxOutputDatum` : "UplcData";
    if ("seed" == Object.keys(variantDetails.fields)[0] && !isDatum) {
      let filteredFields2 = function(indent = 2, callback = mkFieldType, joiner = ",\n") {
        return Object.keys(variantDetails.fields).filter((fieldName) => fieldName !== "seed").map((x) => callback(x, indent)).join(joiner);
      };
      var filteredFields = filteredFields2;
      const activitySummary = `     * generates ${isActivity ? "isActivity/redeemer wrapper with" : ""} UplcData for ***${enumPathExpr}***, 
`;
      return `    /**
` + activitySummary + `     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the \`tcxWithSeedUtxo()\` method in your contract's off-chain StellarContracts subclass 
     * to create a context satisfying \`hasSeed\`.
     * See \`$seeded$${variantName}}\` for use in a context
     * providing an implicit seed utxo. 
` + (isNested ? `    * ### Nested activity: 
    * this is connected to a nested-activity wrapper, so the details are piped through 
    * the parent's uplc-encoder, producing a single uplc object with 
    * a complete wrapper for this inner activity detail.
` : "") + `     */
    ${variantName}(value: hasSeed, fields: { 
${filteredFields2(
        2
      )} 
    } ) : ${returnType}
    /**
     * generates ${isActivity ? "isActivity/redeemer wrapper with" : ""} UplcData for ***${enumPathExpr}*** 
     * with raw seed details included in fields.
     */
    ${variantName}(fields: ${permissiveTypeName} | {
${unfilteredFields(
        3
      )}
    } ): ${returnType}
    ${variantName}(
        seedOrUf: hasSeed | ${permissiveTypeName}, 
        filteredFields?: { 
${filteredFields2(3)}
    }) : ${returnType} {
        if (filteredFields) {
            const seedTxOutputId = this.getSeed(seedOrUf as hasSeed);
            const uplc = this.mkUplcData({
                ${variantName}: { seed: seedTxOutputId, ...filteredFields } 
            }, ${enumPathExpr});
           return uplc;
        } else {
            const fields = seedOrUf as ${permissiveTypeName}; 
           const uplc = this.mkUplcData({
                ${variantName}: fields 
            }, ${enumPathExpr});
           return uplc;
        }
    } /*multiFieldVariant/seeded enum accessor*/ 

    /**
` + activitySummary + `     * @param fields - \\{ ` + filteredFields2(0, void 0, ", ").replace(/([<{}>])/g, "\\$1") + ` \\}
     * @remarks
    * ### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
     * provided implicitly by a SeedActivity-supporting library function. 
     *
     * ## Usage
     *   1. Call the \`$seeded$${variantName}({ ` + filteredFields2(0, (fn) => fn, ", ") + ` })\`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       \`mkTxnCreateRecord({activity})\` method.
` + (isNested ? `    * ## Nested activity: 
    * this is connected to a nested-activity wrapper, so the details are piped through 
    * the parent's uplc-encoder, producing a single uplc object with 
    * a complete wrapper for this inner activity detail.
` : "") + `     */
    $seeded$${variantName} = impliedSeedActivityMaker(this, 
        this.${variantName} as (value: hasSeed, fields: { 
${filteredFields2(
        3
      )} 
        } ) => ${returnType}
    )
    /* coda: seeded helper in same multiFieldVariant/seeded */
`;
    }
    return `    /**
     * generates ${isActivity ? "isActivity/redeemer wrapper with" : ""} ${isDatum ? "InlineTxOutputDatum" : "UplcData"} for ***${enumPathExpr}***
     * @remarks - ***${permissiveTypeName}*** is the same as the expanded field-types.
` + (isNested ? `    * ### Nested activity: 
    * this is connected to a nested-activity wrapper, so the details are piped through 
    * the parent's uplc-encoder, producing a single uplc object with 
    * a complete wrapper for this inner activity detail.
` : "") + `     */
    ${variantName}(fields: ${permissiveTypeName} | { 
` + unfilteredFields() + `
    }) : ${returnType} {
        const uplc = this.mkUplcData({
            ${variantName}: fields 
        }, ${enumPathExpr});
` + (isDatum ? `        return makeInlineTxOutputDatum(uplc);
` : `       return uplc;
`) + `    } /*multiFieldVariant enum accessor*/`;
  }
  mkSingleFieldVariantAccessor(enumTypeDetails, variantDetails, variantName, isDatum = this.datumTypeName === enumTypeDetails.enumName, isActivity = this.redeemerTypeName === enumTypeDetails.enumName, isNested) {
    const fieldName = Object.keys(variantDetails.fields)[0];
    const oneField = variantDetails.fields[fieldName];
    const enumName = variantDetails.dataType.asEnumMemberType?.parentType.name;
    const enumPathExpr = this.getEnumPathExpr(variantDetails);
    const returnType = isActivity ? "isActivity" : isDatum ? "InlineTxOutputDatum" : "UplcData";
    if ("enum" == oneField.typeSchema.kind) {
      return this.mkNestedEnumAccessor(
        enumTypeDetails,
        variantDetails,
        variantName,
        fieldName,
        oneField,
        isActivity
      );
    }
    if ("seed" == fieldName && !isDatum) {
      return `    /**
    * generates ${isActivity ? "isActivity/redeemer wrapper with" : ""} UplcData for ***${enumPathExpr}***, 
    * given a transaction-context (or direct arg) with a ***seed utxo*** 
    * @remarks
    * ### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
    *  - to get a transaction context having the seed needed for this argument, 
    *    see the \`tcxWithSeedUtxo()\` method in your contract's off-chain StellarContracts subclass.
    * - or see the {@link hasSeed} type for other ways to feed it with a TxOutputId.
    *  - in a context providing an implicit seed utxo, use 
    *    the \`$seeded$${variantName}}\` variant of this activity instead
    *
 ` + (isNested ? `    * ## Nested activity: 
    * this is connected to a nested-activity wrapper, so the details are piped through 
    * the parent's uplc-encoder, producing a single uplc object with 
    * a complete wrapper for this inner activity detail.
` : "") + `    */
    ${variantName}(thingWithSeed: hasSeed | ${oneField.permissiveType}) 
    : ${returnType} {
        const seedTxOutputId = this.getSeed(thingWithSeed);
` + (isNested ? `
        // piped through parent's uplc-encoder
` : "") + `        const uplc = this.mkUplcData({ 
           ${variantName}: seedTxOutputId
        },${enumPathExpr});  
        return uplc;
    }  /*singleField/seeded enum variant*/

    /**
     * generates ${isActivity ? "isActivity/redeemer wrapper with" : ""} UplcData for ***${enumPathExpr}***
     * @remarks
    * ### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
     * provided implicitly by a SeedActivity-supporting library function. 
     * ## Usage
     * Access the activity-creator as a getter: \`$seeded$${variantName}\`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * \`mkTxnCreateRecord({activity, ...})\` method.
` + (isNested ? `    * ## Nested activity: 
    * this is connected to a nested-activity wrapper, so the details are piped through 
    * the parent's uplc-encoder, producing a single uplc object with 
    * a complete wrapper for this inner activity detail.
` : "") + `     */
    get $seeded$${variantName}() {
        return impliedSeedActivityMaker(this,this.${variantName})() // called with no args needed
    } /* coda: seeded helper in same singleField/seeded enum variant*/
`;
    }
    let thatType = oneField.permissiveType || "";
    let expandedTypeNote = "";
    if ("permissiveTypeName" in oneField) {
      thatType = `${oneField.permissiveTypeName} | ${oneField.permissiveType}`;
      expandedTypeNote = `     * @remarks - ***${oneField.permissiveTypeName}*** is the same as the expanded field-type.
`;
    }
    const argNameIsFieldName = fieldName;
    return `    /**
     * generates ${isActivity ? "isActivity/redeemer wrapper with" : ""} ${isDatum ? "InlineTxOutputDatum" : "UplcData"} for ***${enumPathExpr}***
${expandedTypeNote}` + (isNested ? `    * ## Nested activity: 
    * this is connected to a nested-activity wrapper, so the details are piped through 
    * the parent's uplc-encoder, producing a single uplc object with 
    * a complete wrapper for this inner activity detail.
` : "") + `     */
    ${variantName}(
        ${argNameIsFieldName}: ${thatType.trimEnd()}
    ) : ${returnType} {
        const uplc = this.mkUplcData({ 
           ${variantName}: ${argNameIsFieldName}
        }, ${enumPathExpr}); /*singleField enum variant*/
` + (isDatum ? `        return makeInlineTxOutputDatum(uplc);
` : `       return uplc;
`) + `    }`;
  }
  includeNamedSchemas() {
    const schemas = Object.entries(this.namedSchemas).map(([name, schema]) => {
      const type = schema.kind === "enum" ? "EnumTypeSchema" : "StructTypeSchema";
      return `export const ${name}Schema : ${type} = ${JSON.stringify(
        schema,
        null,
        4
      )};`;
    }).join("\n\n");
    return schemas;
  }
  // gatherNonEnumDatumAccessors(datumTypeName: string) {
  //     const details = this.datumTypeDetails as typeDetails;
  //     const fields = Object.keys(details.fields).map(fieldName => {
  //         return `${fieldName}: ${details.fields[fieldName].canonicalTypeName}`;
  //     }).join(", ");
  //     return `get ${datumTypeName}() {
  //         return this.toUplcData({ ${datumTypeName}: { ${fields} } });
  //     }`;
  // }
};

// src/helios/StellarHeliosProject.ts
var startTime = Date.now();
var StellarHeliosProject = class _StellarHeliosProject {
  static root;
  bundleEntries;
  capoBundle = void 0;
  projectRoot;
  constructor() {
    this.bundleEntries = /* @__PURE__ */ new Map();
    this.projectRoot = _StellarHeliosProject.findProjectRoot();
  }
  _isSC;
  isStellarContracts() {
    if (this._isSC == void 0) {
      const packageJsonPath = path4.join(this.projectRoot, "package.json");
      if (!existsSync(packageJsonPath)) {
        throw new Error(`package.json not found at ${packageJsonPath}`);
      }
      const packageJson = JSON.parse(
        readFileSync2(packageJsonPath, "utf-8")
      );
      this._isSC = packageJson.name === "@donecollectively/stellar-contracts";
    }
    return this._isSC;
  }
  replaceWithNewCapo(absoluteFilename, newCapoClass) {
    const replacement = new _StellarHeliosProject();
    replacement.loadBundleWithClass(absoluteFilename, newCapoClass);
    replacement.generateBundleTypes(absoluteFilename);
    for (const [filename, entry] of this.bundleEntries.entries()) {
      if (!entry.bundleClass?.isCapoBundle) {
        replacement.loadBundleWithClass(filename, entry.bundleClass);
        replacement.generateBundleTypes(filename);
      }
    }
    return replacement;
  }
  // call from code-generated hlproject.mjs with instantiated bundle
  // call from rollup plugin with bundle filename
  loadBundleWithClass(absoluteFilename, bundleClass, harmlessSecondCapo = false) {
    const filename = absoluteFilename.startsWith(this.projectRoot) ? path4.relative(this.projectRoot, absoluteFilename) : absoluteFilename;
    if (filename.startsWith("/"))
      debugger;
    const bundleClassName = bundleClass.name;
    let bundle;
    let isCapoBundle = bundleClass.isCapoBundle;
    let proto = bundleClass.prototype;
    let parentClassName = "";
    while (proto) {
      const thisClassName = proto.constructor.name;
      if (!parentClassName && bundleClassName !== thisClassName) {
        parentClassName = proto.constructor.name;
        break;
      }
      proto = Object.getPrototypeOf(proto);
    }
    if (isCapoBundle && !harmlessSecondCapo) {
      if (this.capoBundle) {
        throw new Error(`only one CapoBundle is currently supported`);
      }
      this.capoBundle = new bundleClass();
      if (this.bundleEntries.size > 0) {
        throw new Error(`register capo first!! ??`);
      }
      this.bundleEntries.set(filename, {
        filename,
        status: "loaded",
        bundle: this.capoBundle,
        bundleClassName,
        parentClassName,
        bundleClass
      });
    } else if (isCapoBundle && harmlessSecondCapo) {
      console.log(`Project: loading CapoBundle ${bundleClassName}`);
      console.log(
        `  (replaces existing capo ${this.capoBundle?.constructor.name})`
      );
      debugger;
      this.bundleEntries.set(filename, {
        filename,
        status: "loaded",
        bundle: new bundleClass(),
        // harmless second capo
        bundleClassName,
        parentClassName,
        bundleClass
      });
    } else {
      const bundleEntry = {
        filename,
        status: "registering",
        // overwritten below, one way or other
        bundleClass,
        bundleClassName,
        parentClassName
      };
      bundle = new bundleClass(this.capoBundle);
      bundleEntry.bundle = bundle;
      bundleEntry.status = "loaded";
      this.bundleEntries.set(filename, bundleEntry);
    }
  }
  hasBundleClass(filename) {
    if (this.bundleEntries.has(filename)) {
      return this.bundleEntries.get(filename)?.bundle !== void 0;
    }
    if (filename.startsWith(this.projectRoot)) {
      const relativeFilename = path4.relative(this.projectRoot, filename);
      return this.hasBundleClass("./" + relativeFilename);
    }
    console.log(
      `heliosTypeGen: no bundle yet for ${filename}
${[...this.bundleEntries.keys()].map((k) => `  - ${k}`).join("\n")}`
    );
  }
  generateBundleTypes(oneFile) {
    const fn = this.normalizeFilePath(oneFile);
    const bundleEntry = this.bundleEntries.get(fn);
    if (!bundleEntry) {
      throw new Error(`bundle not found: ${fn}`);
    }
    this.writeTypeInfo(oneFile, bundleEntry);
    this.writeDataBridgeCode(
      oneFile.replace(/(\.hlb)?\.[tj]s$/, ".bridge.ts"),
      bundleEntry
    );
  }
  // uses the dataBridgeGenerator class to generate a *.bridge.ts file
  writeDataBridgeCode(oneFilename, bundleEntry) {
    const fn = this.normalizeFilePath(oneFilename);
    const dataBridgeFn = fn.replace(/\.hlb\.[jt]s$/, ".bridge.ts");
    const bundle = bundleEntry.bundle;
    const status = bundleEntry.status;
    if (!bundle) {
      console.warn(
        `not writing data bridge for ${fn} for newly-added bundle (check for hasBundleClass() first?)`
      );
      return;
    }
    if (status !== "loaded") {
      throw new Error(
        `cannot generate data bridge for ${fn} with status ${status}`
      );
    }
    const ts1 = Date.now();
    const bridgeGenerator = dataBridgeGenerator.create(bundle);
    if (this.isStellarContracts())
      bridgeGenerator._isInStellarContractsLib(true);
    const bridgeSourceCode = this.isStellarContracts() ? bridgeGenerator.generateDataBridge(fn, "stellar-contracts") : bridgeGenerator.generateDataBridge(fn);
    this.writeIfUnchanged(dataBridgeFn, bridgeSourceCode);
    writeFileSync(dataBridgeFn, bridgeSourceCode);
    console.log(
      `\u{1F4E6} ${bundle.moduleName}: generated data bridge: ${Date.now() - ts1}ms`
    );
  }
  writeIfUnchanged(filename, source) {
    if (existsSync(filename)) {
      const existingSource = readFileSync2(filename, "utf-8");
      if (existingSource === source) {
        return;
      }
    }
    writeFileSync(filename, source);
    return source;
  }
  normalizeFilePath(filename) {
    const fn = filename.startsWith(this.projectRoot) ? path4.relative(this.projectRoot, filename) : filename;
    if (fn.startsWith("/"))
      debugger;
    return fn;
  }
  writeTypeInfo(filename, bundleEntry) {
    const fn = this.normalizeFilePath(filename);
    const bundle = bundleEntry.bundle;
    const status = bundleEntry.status;
    if (!bundle) {
      console.warn(
        `not writing type info for ${filename} for newly-added bundle (check for hasBundleClass() first?)`
      );
      return;
    }
    if (status !== "loaded") {
      throw new Error(
        `cannot generate types for ${filename} with status ${status}`
      );
    }
    let typeFilename = filename.replace(/(\.hlb)?\.[jt]s$/, ".typeInfo.ts");
    const { bundleClassName, parentClassName } = bundleEntry;
    if (!parentClassName) {
      throw new Error(`no parent class name for ${filename}`);
    }
    const ts1 = Date.now();
    const typeContext = BundleTypeGenerator.create(bundle);
    if (this.isStellarContracts())
      typeContext._isInStellarContractsLib(true);
    const typesSource = typeContext.createAllTypesSource(
      bundleClassName,
      parentClassName,
      typeFilename
    );
    if (this.writeIfUnchanged(typeFilename, typesSource)) {
      console.log(
        `\u{1F4E6} ${bundleClassName}: generated types (${Date.now() - ts1}ms)`
      );
    }
  }
  static findProjectRoot() {
    if (this.root)
      return this.root;
    const cwd = process.cwd();
    let dir = cwd;
    let found = false;
    while (!found) {
      if (existsSync(path4.join(dir, "package.json"))) {
        found = true;
      } else {
        const parent = path4.dirname(dir);
        if (parent === dir) {
          throw new Error(
            `could not find package.json in ${cwd} or any parent directories`
          );
        }
        dir = parent;
      }
    }
    console.log(`\u{1F4E6} StellarHeliosProject: found project root at ${dir}`);
    this.root = dir;
    return dir;
  }
};

// src/helios/heliosRollupTypeGen.ts
import { bytesToHex } from "@helios-lang/codec-utils";

// src/HeliosPromotedTypes.ts
import {
  encodeUtf8,
  decodeUtf8
} from "@helios-lang/codec-utils";

// src/helios/heliosRollupTypeGen.ts
function heliosRollupTypeGen(opts = {}) {
  const options = {
    ...{
      include: /.*\.hlb\.[jt]s$/,
      exclude: [],
      project: "",
      compile: false
    },
    ...opts
  };
  const tempDir = path5.join(process.cwd(), ".hltemp", "typeGen");
  if (!existsSync2(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
  const filter = createFilter2(options.include, options.exclude);
  const projectRoot = StellarHeliosProject.findProjectRoot();
  const state = {
    capoBundle: null,
    // new CapoHeliosBundle(),
    hasExplicitCapoBundle: false,
    hasOtherBundles: false,
    project: new StellarHeliosProject()
  };
  const isJavascript = /\.js$/;
  return {
    name: "helios-type-gen",
    buildEnd: {
      order: "pre",
      handler(error) {
        console.log("heliosTypeGen: buildEnd: " + error ? "error: " : "" + error?.message);
      }
    },
    resolveId: {
      order: "pre",
      async handler(source, importer, options2) {
        const { project } = state;
        if (importer?.match(isJavascript) && source?.match(isJavascript) && importer?.indexOf(project.projectRoot) === 0) {
          const sourceWithTs = source.replace(/\.js$/, ".ts");
          const resolved = await this.resolve(
            source,
            importer.replace(/\.js$/, ".ts"),
            {
              ...options2,
              skipSelf: true
            }
          );
          if (resolved) {
            console.log(
              `heliosTypeGen: in vitest: resolving ${source} as ${sourceWithTs} for ${importer}`
              // {
              //     source,
              //     importer,
              //     resolved,
              // }
            );
            return resolved;
          }
        }
      }
    },
    load: {
      order: "pre",
      handler: async function(id) {
        const { project } = state;
        if (!filter(id)) {
          if (id.match(/hlb/)) {
            console.log(
              `typeGen resolve: skipping due to filter mismatch`,
              { source: id }
            );
            debugger;
            filter(id);
          }
          return null;
        }
        const SomeBundleClass = await rollupMakeBundledScriptClass(id);
        const relativeFilename = path5.relative(projectRoot, id);
        this.warn(`\u{1F441}\uFE0F checking helios bundle ${SomeBundleClass.name} from ${relativeFilename}`);
        let bundle = new SomeBundleClass();
        let program = bundle.program;
        let replacedCapo = false;
        if (SomeBundleClass.isCapoBundle) {
          let skipInstallingThisOne = false;
          if (state.hasExplicitCapoBundle) {
            let existingBundleProtoChainNames = [];
            let existingBundleProto = state.capoBundle.constructor;
            while (existingBundleProto) {
              existingBundleProtoChainNames.push(existingBundleProto.name);
              existingBundleProto = Object.getPrototypeOf(existingBundleProto);
            }
            if (existingBundleProtoChainNames.includes(SomeBundleClass.name)) {
              skipInstallingThisOne = true;
              console.log(
                `Helios project-loader: not adopting ${SomeBundleClass.name} as the project Capo
  ... because it looks like a base class of already-loaded ${state.capoBundle.constructor.name}`
              );
            } else {
              debugger;
            }
          }
          if (state.hasOtherBundles && !skipInstallingThisOne) {
            const digestExisting = shortHash(JSON.stringify(state.capoBundle.modules));
            const digestNew = shortHash(JSON.stringify(SomeBundleClass.prototype.modules));
            if (digestExisting !== digestNew) {
              throw new Error(`unreachable code path`);
              console.log(`existing = ${digestExisting}`, state.capoBundle.modules.map((x) => JSON.stringify({ name: x.name, content: shortHash(x.content) })));
              console.log(`late arrival: ${digestNew}`, SomeBundleClass.prototype.modules.map((x) => JSON.stringify({ name: x.name, content: shortHash(x.content) })));
              console.log("  ^^^^ from", id);
              console.log("  ---- Late-arriving Capo.  Reinitializing project with updated dependencies...");
              const ts1 = Date.now();
              state.project = state.project.replaceWithNewCapo(id, SomeBundleClass);
              console.log("  ---- Reinitialized project in", Date.now() - ts1, "ms");
              replacedCapo = true;
            } else {
              console.log("  ---- warning: second capo discovered, though its modules aren't different from default. Generatings its types, but otherwise, Ignoring.");
              const newProject = new StellarHeliosProject();
              newProject.loadBundleWithClass(id, SomeBundleClass);
              newProject.generateBundleTypes(id);
            }
          }
          state.hasExplicitCapoBundle = true;
          bundle = new SomeBundleClass();
          if (!replacedCapo) {
          }
          console.log(` \u{1F441}\uFE0F checking (Capo) helios bundle ${SomeBundleClass.name}`);
          if (!skipInstallingThisOne) {
            state.capoBundle = bundle;
            state.project.loadBundleWithClass(id, SomeBundleClass);
            state.project.generateBundleTypes(id);
          }
        } else {
          state.hasOtherBundles = true;
          if (state.project.bundleEntries.size === 0) {
            console.log("looks like you're using the default Capo bundle. ok!\n");
            const capoName = bundle.capoBundle.constructor.name;
            if (capoName == "CapoHeliosBundle" && !state.capoBundle) {
              state.project.loadBundleWithClass(
                "src/CapoHeliosBundle.ts",
                bundle.capoBundle.constructor
              );
              state.project.generateBundleTypes(
                "src/CapoHeliosBundle.ts"
              );
            }
          }
          state.project.loadBundleWithClass(id, SomeBundleClass);
          try {
            state.project.generateBundleTypes(id);
          } catch (e) {
            if (e.message.match("compilerError")) {
              console.error(e);
              throw new Error(`Error in Helios script (see above)`);
            }
            console.error(`Error generating types for ${id}:
`, e);
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                reject(new Error(`type-generation error (see above)`));
              }, 5e3);
            });
          }
          this.warn("ok");
        }
        return null;
      }
    }
  };
  async function rollupMakeBundledScriptClass(inputFile) {
    const outputFile = inputFile.replace(
      /\.hlb\.[tj]s$/,
      ".hlb.bundled.mjs"
      // ??? move to dist/ or .hltemp/?  hlbundle
    );
    if (inputFile == outputFile) {
      throw new Error(`inputFile cannot be the same as outputFile`);
    }
    const buildStartTime = Date.now();
    console.log(`\u{1F4E6} StellarHeliosProject: loading ${inputFile}`);
    let didWarn = false;
    const bundle = await rollup({
      input: inputFile,
      external(id) {
        return !/^[./]/.test(id);
      },
      onwarn(warning, warn) {
        if (warning.code === "UNUSED_EXTERNAL_IMPORT")
          return;
        if (warning.code === "CIRCULAR_DEPENDENCY") {
          if (warning.message == "Circular dependency: src/StellarTxnContext.ts -> src/diagnostics.ts -> src/StellarTxnContext.ts" || warning.message == "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts" || warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramFs.ts -> src/helios/CachedHeliosProgram.ts" || warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramWeb.ts -> src/helios/CachedHeliosProgram.ts" || warning.message == "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/diagnostics.ts" || warning.message == "Circular dependency: src/diagnostics.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts") {
            if (didWarn)
              return;
            didWarn = true;
            return;
          }
        }
        warn(warning);
      },
      plugins: [
        heliosRollupLoader({
          // todo make this right for the context
          project: "stellar-contracts"
          // onLoadHeliosFile: (filename) => {
          //   remember this list of files
          // }
        }),
        // !!! figure out how to make the bundle include the compiled & optimized
        //   program, when options.compile is true.  
        esbuild({
          tsconfig: "./tsconfig.json",
          target: ["node18"],
          sourceMap: false
        })
        // after the build is finished, append the list of input files
        // in a way making it quick and easy to load an existing compiled
        // file and let it check its own input files for changes.  Then
        // we can save time and avoid this build step if everything is already good.
      ]
      // output: {
      //     file: this.compiledProjectFilename,
      //     sourcemap: true,
      //     format: "es",
      // },
    }).catch((error) => {
      console.error("Error during rollup of helios bundle:", error);
      throw error;
    });
    const result = await bundle.generate({ format: "es" });
    if (result.output.length > 1) {
      throw new Error(`unexpected: bundle should have one output`);
    }
    const compiled = result.output[0].code;
    let buildTime = Date.now() - buildStartTime;
    let needsWrite = true;
    if (existsSync2(outputFile)) {
      const existing = readFileSync3(outputFile, "utf-8");
      if (existing === compiled) {
        console.log(
          `\u{1F4E6} StellarHeliosProject: unchanged bundle (${buildTime}ms): ${outputFile}`
        );
        needsWrite = false;
      }
    }
    if (needsWrite) {
      await bundle.write({
        file: outputFile,
        // sourcemap: true,  // ?? how to get this to work properly?  debugging goes to wrong site
        format: "es"
      });
      buildTime = Date.now() - buildStartTime;
      console.log(
        `\u{1F4E6} StellarHeliosProject: wrote compiled bundle (${buildTime}ms): ${outputFile}`
      );
    }
    bundle.close();
    return import(outputFile).then((mod) => {
      if (mod.default) {
        const BundleClass = mod.default;
        return BundleClass;
      } else {
        throw new Error(`no default export in ${outputFile}`);
      }
    });
  }
  async function makeCapoHeliosBundle() {
    throw new Error(`not implemented2`);
    const outputFile = path5.join(tempDir, "CapoHeliosBundle.mjs");
    console.log(`\u{1F4E6} StellarHeliosProject: making CapoHeliosBundle: ${outputFile}`);
    const buildStartTime = Date.now();
    let didWarn = false;
    const bundle = await rollup({
      input: path5.join("src/CapoHeliosBundle.ts"),
      external(id) {
        return !/^[./]/.test(id);
      },
      onwarn(warning, warn) {
        if (warning.code === "UNUSED_EXTERNAL_IMPORT")
          return;
        if (warning.code === "CIRCULAR_DEPENDENCY") {
          if (warning.message == "Circular dependency: src/StellarTxnContext.ts -> src/diagnostics.ts -> src/StellarTxnContext.ts" || warning.message == "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts" || warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramFs.ts -> src/helios/CachedHeliosProgram.ts" || warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramWeb.ts -> src/helios/CachedHeliosProgram.ts" || warning.message == "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/diagnostics.ts" || warning.message == "Circular dependency: src/diagnostics.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts") {
            if (didWarn)
              return;
            didWarn = true;
            return;
          }
        }
        warn(warning);
      },
      plugins: [
        heliosRollupLoader({
          project: "stellar-contracts"
        }),
        esbuild({
          tsconfig: "./tsconfig.json",
          target: ["node18"],
          sourceMap: false
        })
      ]
    }).catch((error) => {
      console.error("Error during rollup of CapoHeliosBundle:", error);
      throw error;
    });
    const result = await bundle.generate({ format: "es" });
    const compiled = result.output[0].code;
    const buildTime = Date.now() - buildStartTime;
    console.log(`\u{1F4E6} CapoHeliosBundle: generated temporary bundle (${buildTime}ms): ${outputFile}`);
    let needsWrite = true;
    if (existsSync2(outputFile)) {
      const existing = readFileSync3(outputFile, "utf-8");
      if (existing === compiled) {
        console.log(
          `\u{1F4E6} CapoHeliosBundle: unchanged bundle (${buildTime}ms): ${outputFile}`
        );
        needsWrite = false;
      }
    }
    if (needsWrite) {
      await bundle.write({
        file: outputFile,
        format: "es"
      });
      console.log(
        `\u{1F4E6} CapoHeliosBundle: wrote compiled bundle (${buildTime}ms): ${outputFile}`
      );
    }
    console.log("importing CapoHeliosBundle");
    return import(outputFile).then((mod) => {
      console.log("CapoHeliosBundle loaded", outputFile);
      return mod.CapoHeliosBundle;
    });
  }
}
function shortHash(str) {
  return bytesToHex(blake2b(encodeUtf8(str)).slice(0, 5));
}
export {
  heliosRollupLoader,
  heliosRollupTypeGen
};
//# sourceMappingURL=rollupPlugins.mjs.map
