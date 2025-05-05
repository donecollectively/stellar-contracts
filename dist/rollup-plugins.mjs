// src/helios/rollupPlugins/heliosRollupLoader.ts
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
  function resolveId(source, importer, options) {
    const where = new Error(`here!`).stack;
    if (!filter(source)) {
      return null;
    }
    this.addWatchFile(source);
    return {
      id: source
    };
  }
  ;
  return {
    name: "helios",
    resolveId,
    // the resolver hook from above
    load(id) {
      if (filter(id)) {
        const relPath = path.relative(".", id);
        this.warn(`.hl watch: ${id}`);
        this.addWatchFile(id);
        const content = readFileSync(relPath, "utf-8");
        const [_, purpose, moduleName] = content.match(
          /(module|minting|spending|endpoint)\s+([a-zA-Z0-9]+)/m
        ) || [];
        if (!(purpose && moduleName))
          throw new Error(`Bad format for helios file ${id}`);
        const code = `import { makeSource } from "@helios-lang/compiler-utils";
const ${moduleName}_hl = makeSource(
  ${JSON.stringify(content)}, {
    project: ${JSON.stringify(project)},
    purpose: ${JSON.stringify(purpose)},
    name:  ${JSON.stringify(
          relPath
        )}, // source filename
    moduleName:  ${JSON.stringify(moduleName)},
})

export default ${moduleName}_hl
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

// src/helios/rollupPlugins/heliosRollupBundler.ts
import path6 from "path";
import { existsSync as existsSync3, mkdirSync, readFileSync as readFileSync4 } from "fs";
import { createFilter as createFilter2 } from "rollup-pluginutils";
import MagicString from "magic-string";
import colors from "ansi-colors";
import "rollup";
import { blake2b as blake2b2 } from "@helios-lang/crypto";
import { bytesToHex as bytesToHex5 } from "@helios-lang/codec-utils";

// src/helios/rollupPlugins/StellarHeliosProject.ts
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
      if (moreInfo) details.moreInfo = moreInfo;
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
    if (moreInfo) details.moreInfo = moreInfo;
    this.collaborator?.registerNamedType?.(details);
    return details;
  }
  gatherVariantDetails(variantDataType, enumId) {
    if (!variantDataType.toSchema) debugger;
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
      ergoCanonicalType: ergoType == canonType ? `${enumId.enumName}$${variantName}  /*ergo like-canonical-this-variant*/` : ergoType,
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
        if (useTypeNamesAt) return nameLikeOrName;
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
        if (useTypeNamesAt) return nameLikeOrName;
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
        if (variantInfo === "tagOnly") return variantInfo;
        if (Array.isArray(variantInfo)) {
          const fullVariantName = `${parentName}$${name}`;
          if (typeVariety === "permissive") {
            nameLikeOrName = `${parentName}$${$nameLike}`;
          } else if (typeVariety === "ergonomic") {
            nameLikeOrName = `${parentName}$Ergo$${name}`;
          } else {
            nameLikeOrName = fullVariantName;
          }
          if (useTypeNamesAt) return nameLikeOrName;
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
        "src/helios/scriptBundling/HeliosScriptBundle.js"
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
    return `
            /**
            * @internal
            */
            export type ${name}Meta = ${typeInfo.canonicalMetaType}

/**
 * ${name} enum variants
 * 
 * @remarks - expresses the essential raw data structures
 * supporting the **${Object.keys(typeInfo.variants).length} variant(s)** of the ${name} enum type
 * 
 * - **Note**: Stellar Contracts provides a higher-level \`${name}Helper\` class
 *     for generating UPLC data for this enum type
 * @public
 */
export type ${name} = ${typeInfo.canonicalType}
/**
 * ergonomic type enabling easy access to values converted from the on-chain form
 * @remarks
 * The data will be expressed in canonical form, and enum variants are merged to a single type with optional fields.
 * Nested enums are also merged in this ergonomic way.
 * @public
 */
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
 * #### Permissive Type
 * This is a permissive type that allows additional input data types, which are 
 * converted by convention to the canonical types used in the on-chain context.
 * @public
 */
export type ${name}Like = IntersectedEnum<${typeInfo.permissiveType}>
`;
  }
  generateOtherNamedTypeSource(name, typeInfo) {
    if (!typeInfo.ergoCanonicalTypeName) throw new Error("missing ergoCanonicalTypeName");
    if (!typeInfo.permissiveTypeName) throw new Error("missing permissiveTypeName");
    const schema = typeInfo.typeSchema;
    const minimalTypeInfo = schema.kind === "struct" && !!schema.fieldTypes.find((f) => f.name === "id" && f.type.kind == "internal" && f.type.name == "ByteArray") && !!schema.fieldTypes.find((f) => f.name === "type" && f.type.kind == "internal" && f.type.name == "String") ? `
/**
 * expresses the essential fields needed for initiating creation of a ${typeInfo.canonicalTypeName}
 * @public
 */
export type minimal${typeInfo.canonicalTypeName} = minimalData<${typeInfo.permissiveTypeName}>` : "";
    return `/**
 * A strong type for the canonical form of ${typeInfo.canonicalTypeName || name}
 * @remarks
 * Note that any enum fields in this type are expressed as a disjoint union of the enum variants.  Processing
 * enum data conforming to this type can be a bit of a pain.
 * For a more ergonomic, though less strictly-safe form of this type, see ${typeInfo.ergoCanonicalTypeName} instead.
 * @public
 */
export interface ${typeInfo.canonicalTypeName || name} ${typeInfo.canonicalType}

/**
 * An ergonomic, though less strictly-safe form of ${typeInfo.canonicalTypeName || name}
 * @remarks
 * This type can use enums expressed as merged unions of the enum variants.  You might think of this type
 * as being "read-only", in that it's possible to create data with this type that would not be suitable for
 * conversion to on-chain use.  For creating such data, use the ${typeInfo.permissiveTypeName} type,
 * or the on-chain data-building helpers instead.
 * @public
 */
export type ${typeInfo.ergoCanonicalTypeName} = ${typeInfo.ergoCanonicalType}

/**
 * A strong type for the permissive form of ${typeInfo.canonicalTypeName || name}
 * @remarks
 * The field types enable implicit conversion from various allowable input types (including the canonical form).
 * @public
 */
export interface ${typeInfo.permissiveTypeName} ${typeInfo.permissiveType}
${minimalTypeInfo}
`;
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
                        { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
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
 * @remarks
* This class doesn't need to be used directly.  Its methods are available through the ***contract's methods***:
*  - \`get mkDatum\` - returns the datum-building bridge for the contract's datum type
*  - \`get activity\` - returns an activity-building bridge for the contract's activity type
*  - \`get reader\` - (advanced) returns a data-reader bridge for parsing CBOR/UPLC-encoded data of specific types
*  - \`get onchain\` - (advanced) returns a data-encoding bridge for types defined in the contract's script
* The advanced methods are not typically needed - mkDatum and activity should normally provide all the
* type-safe data-encoding needed for the contract.  For reading on-chain data, the Capo's \`findDelegatedDataUtxos()\` 
* method is the normal way to locate and decode on-chain data without needing to explicitly use the data-bridge helper classes.
* 
* ##### customizing the bridge class name
* Note that you may override \`get dataBridgeName() { return "..." }\` to customize the name of this bridge class
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
    return `    reader = new ${readerClassName}(this, this.isMainnet);
`;
  }
  generateDataReaderClass(className) {
    return `/*
 * @public
 */
export class ${className} extends DataBridgeReaderClass {
    constructor(public bridge: ${this.bundle.bridgeClassName}, isMainnet: boolean) {
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
        * #### Standard WARNING
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
        * #### Standard WARNING
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
        ${typeName}: new ${helperClassName}({isMainnet: this.isMainnet}),`;
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
    /**
     * @internal
    */        
    \u1C7A\u1C7AactivityCast = makeCast<
        ${canonicalType}, ${permissiveType}
    >(${schemaName}, { 
        isMainnet: this.isMainnet,
        unwrapSingleFieldEnumVariants: true
    }); // activityAccessorCast`;
    if (activityDetails.typeSchema.kind === "enum") {
      const helperClassName = `${activityName}Helper`;
      return `
    /**
     * generates UplcData for the activity type (***${activityTypeName}***) for the \`${this.bundle.program.name}\` script
     */
    activity : ${helperClassName}= new ${helperClassName}({isMainnet: this.isMainnet, isActivity: true}); // activityAccessor/enum
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
     = new ${helperClassName}({isMainnet: this.isMainnet}) ${helperClassTypeCast} ` + datumAccessorVarietyAnnotation + typeNameAccessor + `

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
        * @internal
        * uses unicode U+1c7a - sorts to the end */
    \u1C7A\u1C7Acast = makeCast<
        ${canonicalType}, ${permissiveType}
    >(
        ${JSON.stringify(typeSchema)}, 
        { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
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
            * @internal
            * uses unicode U+1c7a - sorts to the end */
    \u1C7A\u1C7Acast = makeCast<${typeDetails.canonicalTypeName}, ${typeDetails.permissiveTypeName}>(
        ${structName}Schema,
        { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
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
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export class ${helperClassName} extends ${parentClass} {
    /*mkEnumHelperClass*/
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    \u1C7A\u1C7Acast = makeCast<${typeDetails.canonicalTypeName}, ${typeDetails.permissiveTypeName}>(
        ${enumName}Schema,
        { isMainnet: this.isMainnet, unwrapSingleFieldEnumVariants: true }
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
            isMainnet: this.isMainnet, isNested: true, isActivity: ${isActivity ? "true" : "false"} 
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
` + (isNested ? `    * ##### Nested activity: 
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
` + activitySummary + `     * @param fields - \\{ ` + filteredFields2(0, void 0, ", ").replace(
        /([<{}>])/g,
        "\\$1"
      ) + ` \\}
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
     * provided implicitly by a SeedActivity-supporting library function. 
     *
     * #### Usage
     *   1. Call the \`$seeded$${variantName}({ ` + filteredFields2(0, (fn) => fn, ", ") + ` })\`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       \`mkTxnCreateRecord({activity})\` method.
` + (isNested ? `    * ##### Nested activity: 
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
` + (isNested ? `    * ##### Nested activity: 
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
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
    *  - to get a transaction context having the seed needed for this argument, 
    *    see the \`tcxWithSeedUtxo()\` method in your contract's off-chain StellarContracts subclass.
    * - or see the {@link hasSeed} type for other ways to feed it with a TxOutputId.
    *  - in a context providing an implicit seed utxo, use 
    *    the \`$seeded$${variantName}}\` variant of this activity instead
    *
 ` + (isNested ? `    * ##### Nested activity: 
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
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be 
     * provided implicitly by a SeedActivity-supporting library function. 
     * #### Usage
     * Access the activity-creator as a getter: \`$seeded$${variantName}\`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * \`mkTxnCreateRecord({activity, ...})\` method.
` + (isNested ? `    * #### Nested activity: 
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
${expandedTypeNote}` + (isNested ? `    * @remarks
    * #### Nested activity: 
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

// src/networkClients/mkCancellablePromise.ts
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
function mkCancellablePromise(options) {
  const {
    wrap: wrapped,
    timeout,
    onTimeout
  } = options || {};
  const { promise, resolve, reject } = Promise.withResolvers();
  const cancel = () => {
    cpObj.status = "cancelled";
    if (timeoutId) clearTimeout(timeoutId);
    reject(new Error("cancelled"));
  };
  const wrappedResolve = (x) => {
    resolve(x);
    cpObj.status = "fulfilled";
  };
  const wrappedReject = (e) => {
    cpObj.status = "rejected";
    reject(e);
  };
  const cpObj = {
    promise,
    status: "pending",
    resolve: wrappedResolve,
    reject: wrappedReject,
    cancel
  };
  let timeoutId = timeout ? setTimeout(() => {
    if (cpObj.status !== "cancelled") {
      cpObj.status = "timeout";
      onTimeout?.();
      reject(new Error("timeout"));
    }
  }, timeout) : void 0;
  promise.then(() => {
    if (timeoutId) clearTimeout(timeoutId);
    cpObj.status = "fulfilled";
    timeoutId = void 0;
  }, () => {
  });
  if (wrapped) {
    wrapped.then(wrappedResolve, wrappedReject);
    return {
      promise,
      isWrapped: "wraps an input promise; no separate resolve/reject",
      status: "pending",
      cancel
    };
  }
  return cpObj;
}

// src/helios/rollupPlugins/StellarHeliosProject.ts
var startTime = Date.now();
var StellarHeliosProject = class _StellarHeliosProject {
  static details;
  configuredCapo = mkCancellablePromise();
  bundleEntries;
  capoBundleName;
  capoBundle = void 0;
  constructor() {
    this.bundleEntries = /* @__PURE__ */ new Map();
    const {
      projectRoot,
      packageJSON
    } = _StellarHeliosProject.findProjectDetails();
    this._isSC = packageJSON.name === "@donecollectively/stellar-contracts";
  }
  _isSC;
  isStellarContracts() {
    return this._isSC;
  }
  get projectRoot() {
    return _StellarHeliosProject.details.projectRoot;
  }
  replaceWithNewCapo(absoluteFilename, newCapoClass) {
    throw new Error(`dead code?!?!`);
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
    if (harmlessSecondCapo) {
      throw new Error("deprecated use of arg3 'harmlessSecondCapo'");
    }
    const filename = absoluteFilename.startsWith(this.projectRoot) ? path4.relative(this.projectRoot, absoluteFilename) : absoluteFilename;
    if (filename.startsWith("/")) debugger;
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
      this.capoBundle = new bundleClass({ setup: { isMainnet: false } });
      const registeredCapoName = bundleClass.name;
      if (this.bundleEntries.size > 0) {
        for (const [filename2, entry] of this.bundleEntries.entries()) {
          const thatCapoName = entry.bundle?.capoBundle?.constructor.name;
          if (thatCapoName !== registeredCapoName) {
            console.log("new capo bundle is " + registeredCapoName);
            console.log("pre-registered bundle uses capo " + thatCapoName);
            throw new Error(`mismatched capo bundle for ${filename2} (see details above)`);
          }
        }
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
      throw new Error("dead code path");
      console.log(`Project: loading CapoBundle ${bundleClassName}`);
      console.log(
        `  (replaces existing capo ${this.capoBundle?.constructor.name})`
      );
      debugger;
      this.bundleEntries.set(filename, {
        filename,
        status: "loaded",
        bundle: new bundleClass({ setup: { isMainnet: false } }),
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
      bundle = new bundleClass({ setup: { isMainnet: false } });
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
      `helios project: no bundle yet for ${filename}
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
    if (this.isStellarContracts()) {
      if (dataBridgeFn.match(/\b(testing|tests)\//)) {
        console.log(`   ------- from testing package or tests: ${dataBridgeFn} -- uses @donecollectively/stellar-contracts for imports`);
      } else {
        bridgeGenerator._isInStellarContractsLib(true);
      }
    }
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
    if (fn.startsWith("/")) debugger;
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
    if (this.isStellarContracts()) {
      if (filename.match(/\b(testing|tests)\//)) {
        console.log(`   ------- from testing package or tests: ${filename} -- uses @donecollectively/stellar-contracts for imports`);
      } else {
        typeContext._isInStellarContractsLib(true);
      }
    }
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
  static findProjectDetails() {
    if (this.details) return this.details;
    const cwd = process.cwd();
    let dir = cwd;
    let found = false;
    let packageJSON = {};
    while (!found) {
      const fileName = path4.join(dir, "package.json");
      if (existsSync(fileName)) {
        found = true;
        packageJSON = JSON.parse(readFileSync2(fileName, "utf-8"));
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
    console.log(`\u{1F4E6} StellarHeliosProject: found project root at ${dir}: ${packageJSON.name}`);
    this.details = {
      packageJSON,
      projectRoot: dir
    };
    return this.details;
  }
};

// src/HeliosPromotedTypes.ts
import {
  encodeUtf8,
  decodeUtf8
} from "@helios-lang/codec-utils";

// src/helios/rollupPlugins/rollupCreateHlbundledClass.ts
import { existsSync as existsSync2, readFileSync as readFileSync3 } from "fs";
import {
  rollup
} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import path5 from "path";
async function rollupCreateHlbundledClass(inputFile, projectRoot) {
  const outputFile = inputFile.replace(
    /\.hlb\.[tj]s$/,
    ".hlBundled.mjs"
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
      if (warning.code === "UNUSED_EXTERNAL_IMPORT") return;
      if (warning.code === "CIRCULAR_DEPENDENCY") {
        if (warning.message == "Circular dependency: src/StellarTxnContext.ts -> src/diagnostics.ts -> src/StellarTxnContext.ts" || warning.message == "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts" || warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramFs.ts -> src/helios/CachedHeliosProgram.ts" || warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramWeb.ts -> src/helios/CachedHeliosProgram.ts" || warning.message == "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/diagnostics.ts" || warning.message == "Circular dependency: src/diagnostics.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts") {
          if (didWarn) return;
          didWarn = true;
          return;
        }
      }
      warn(warning);
    },
    plugins: [
      // stellarDeploymentHook("plugin"),
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
        `\u{1F4E6} StellarHeliosProject: unchanged bundle (${buildTime}ms): ${path5.relative(projectRoot, outputFile)}`
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

// src/configuration/DeployedScriptConfigs.ts
import {
  makeMintingPolicyHash,
  makeTxId,
  makeValidatorHash
} from "@helios-lang/ledger";
function parseCapoJSONConfig(rawJsonConfig) {
  const jsonConfig = typeof rawJsonConfig === "string" ? JSON.parse(rawJsonConfig) : rawJsonConfig;
  const { mph, rev, seedTxn, seedIndex, rootCapoScriptHash } = jsonConfig;
  const outputConfig = {};
  if (!mph) throw new Error("mph is required");
  if (!seedTxn) throw new Error("seedTxn is required");
  if (!seedIndex) throw new Error("seedIndex is required");
  if (!rootCapoScriptHash) throw new Error("rootCapoScriptHash is required");
  outputConfig.mph = makeMintingPolicyHash(mph.bytes);
  outputConfig.rev = BigInt(rev || 1);
  outputConfig.seedTxn = makeTxId(seedTxn.bytes);
  outputConfig.seedIndex = BigInt(seedIndex);
  outputConfig.rootCapoScriptHash = makeValidatorHash(
    rootCapoScriptHash.bytes
  );
  return outputConfig;
}

// src/helios/CachedHeliosProgram.ts
import {
  Program
} from "@helios-lang/compiler";
import {
  decodeUplcProgramV2FromCbor,
  makeUplcSourceMap
} from "@helios-lang/uplc";
import { bytesToHex } from "@helios-lang/codec-utils";
import { blake2b } from "@helios-lang/crypto";
import { extractName } from "@helios-lang/compiler";
var redirecToCorrectConstructor = "\u{1F422}${this.id}: wrong direct use of new() constructor in CachedHeliosProgram; use forCurrentPlatform() instead";
var CachedHeliosProgram = class _CachedHeliosProgram extends Program {
  // static memoryCache = new Map<string, UplcProgramV2 | UplcProgramV3>();
  props;
  locks = /* @__PURE__ */ new Map();
  programElements;
  cacheEntry;
  sources;
  static id = globalThis?.id || Math.floor(Math.random() * 1e3).toString();
  id;
  /**
   * Creates a new CachedHeliosProgram.
   * @remarks
   * Expects the same arguments as the Helios {@link Program} constructor.
   *
   * Returns a Program subclass that also conforms to the CachedHeliosProgram interface.
   *
   * Use the {@link compileCached | compileCached()} method to compile the program.
   * @public
   */
  constructor(mainSource, props) {
    super(mainSource, props);
    this.sources = [mainSource, ...props?.moduleSources || []];
    this.programElements = {};
    this.id = this.subclass.id;
    const effectiveProps = {
      ...{
        timeout: 3e4
      },
      ...props || {}
    };
    this.props = effectiveProps;
    if (this.constructor === _CachedHeliosProgram) {
      throw new Error(redirecToCorrectConstructor);
    }
  }
  /**
   * Checks for the presence of a cache key, without attempting a lock.  Indicates
   * whether the program is in the cache; if so, no lock is needed to read it.  Returns
   * the cached program if found, or null if not found.  Must be implemented by each subclass
   * as a platform-specific STATIC method.
   */
  static async ifCached(cacheKey) {
    throw new Error(redirecToCorrectConstructor);
  }
  /**
   * Acquires a lock for the given cache key.  Must be implemented by each subclass
   * as a platform-specific STATIC method.  Blocks while waiting for the lock.  Returns
   * the lock details or throws an error if the lock cannot be acquired.
   * The method receives the cache key and the program properties, which includes
   * the timeout to be used.
   */
  static async acquireLock(cacheKey, props) {
    throw new Error(redirecToCorrectConstructor);
  }
  /**
   * Acquires a lock for the given cache key, but does not wait.  Must be implemented by each subclass
   * as a platform-specific STATIC method.
   */
  static async acquireImmediateLock(cacheKey, props) {
    throw new Error(redirecToCorrectConstructor);
  }
  /**
   * Stores a compiled UPLC program in the cache.  Must be implemented by each subclass
   * as a platform-specific STATIC method.
   */
  static async cacheStore(key, value, raw) {
    throw new Error(redirecToCorrectConstructor);
  }
  static async initCacheFromBundle(cacheEntries) {
    for (const [key, value] of Object.entries(cacheEntries)) {
      const found = await this.ifCached(key);
      if (found) {
        console.log(
          `\u{1F422}${this.id}: duplicate key in compiler cache: ${key}`
        );
      }
      if ("string" === typeof value) {
        this.cacheStore(
          key,
          value,
          this.toHeliosProgramCacheEntry(JSON.parse(value))
        );
      } else {
        const { version } = value;
        if (version !== "PlutusV2" && version !== "PlutusV3") {
          console.log(
            `\u{1F422}${this.id}: unknown version '${version}'' in compiler cache entry: ${key}; skipping`
          );
          continue;
        }
        try {
          programFromCacheEntry(value);
        } catch (e) {
          console.log(e.message);
          console.log(
            `^^ \u{1F422}${this.id}: error parsing CBOR program from cache entry: ${key}; skipping`
          );
          continue;
        }
        this.cacheStore(
          key,
          JSON.stringify(value),
          this.toHeliosProgramCacheEntry(value)
        );
      }
    }
  }
  static toHeliosProgramCacheEntry(value) {
    throw new Error("todo");
  }
  /**
   * for vscode index view
   * @internal
   */
  async ______endStatics() {
  }
  // hashObjectElements(obj: Record<string, string>): Record<string, string> {
  //     return Object.fromEntries(
  //         Object.entries(obj).map(([name, content]) => [
  //             name,
  //             bytesToHex(blake2b(textToBytes(content))),
  //         ])
  //     );
  // }
  /**
   * transforms an object of strings, hashing its values
   */
  hashObjectEntries(obj) {
    return Object.fromEntries(
      Object.entries(obj).map(([name, content]) => [
        name,
        bytesToHex(blake2b(encodeUtf8(content)))
      ])
    );
  }
  /**
   * transforms an object of strings to a text representation in RFC822 "headers" style
   */
  objectToText(obj) {
    return Object.entries(obj).map(([name, content]) => `${name}: ${content}`).join("\n");
  }
  /**
   * Builds an index of the source code hashes for the program elements
   * (main script, other modules)
   */
  sourceHashIndex() {
    return this.hashObjectEntries(
      Object.fromEntries(
        this.sources.map((s) => {
          const name = "string" === typeof s ? extractName(s) : s.name;
          const content = "string" === typeof s ? s : s.content;
          return [name, content];
        })
      )
    );
  }
  /**
   * Gathers the program elements needed for caching
   */
  gatherProgramElements() {
    return this.programElements = {
      ...this.sourceHashIndex(),
      params: this.entryPoint.paramsDetails()
    };
  }
  computeInputsHash(options) {
    const index = {
      ...this.programElements
    };
    const { params, ...otherElements } = index;
    const elementsText = this.objectToText(otherElements);
    const paramsContent = this.objectToText(params);
    const optimizeText = this.textOptimizeOptions(options);
    const optimizeHash = bytesToHex(blake2b(encodeUtf8(optimizeText)));
    const paramsHashText = this.objectToText(
      this.hashObjectEntries({ params: paramsContent })
    );
    return bytesToHex(
      blake2b(
        encodeUtf8(
          elementsText + "\n" + paramsHashText + "\n" + optimizeHash + "\n"
        )
      )
    );
  }
  optimizeOptions(options) {
    let optimize = true == options.optimize ? {} : options.optimize ?? {};
    return optimize;
  }
  textOptimizeOptions(options) {
    let optimize = this.optimizeOptions(options);
    if (false == optimize) return "unoptimized";
    let o = optimize;
    return this.objectToText(
      // sort the keys in optimize.
      Object.fromEntries(
        Object.entries(o).sort(([a], [b]) => a.localeCompare(b))
      )
    );
  }
  get preferredProgramName() {
    return this.props.name || this.name;
  }
  getCacheKey(options) {
    if (this.props.cacheKey) {
      return this.props.cacheKey;
    }
    const hashString = this.computeInputsHash(options);
    const opt = false == options.optimize ? "-unoptimized" : "";
    return `${this.preferredProgramName}${opt}-${hashString}`;
  }
  /**
   * Compiles a Helios program to UPLC, with caching for performance
   *
   * ### Caching behavior
   * This method seeks to quickly return a compiled version of the program, using
   * a platform-specific cache (and lock) mechanism.
   * #### Happy path
   *  - if the program is found in the cache, it is immediately returned
   * #### First compilation and cache-storage
   *  - Otherwise, a lock is acquired and the program is compiled
   *  - Once compiled, the cache entry is created for future use, and its lock is lifted
   *
   * #### When there is a compile already pending
   *
   * Once a Helios program starts compiling once, calling `compileCached()` on any
   * instance of the same program with the same settings results in the same cache
   * key.  This may occur in a different browser tab, service worker, node-js thread/worker,
   * or a different node process.  In each case, the second `compileCached()` call:
   *
   *  - Issues a warning that it is waiting for another process to complete the compilation.
   *  - waits up to 15 seconds (or the configured `timeout`) for a lock (indicating that
   *    another instance is compiling the program already)
   * - when the lock  is released, the compiled program is read from the cache, and returned.
   *  - includes the unoptimized version of the UPLC program for logging
   *
   * #### When everything goes wrong
   * If the process holding a lock doesn't succeed and doesn't release the lock, the
   * lock goes stale automatically, and the lock fails (after the `timeout` period).  In
   * this case, each instance of the program:
   *
   *   - makes a last attempt to compile the program
   *   - If it fails, the local process will report the error normally, and no caching is done
   *   - If it succeeds, the result is returned.
   *   - it also tries to cache the result (if it can do so without delay)
   *
   *  - todo: measure the time cost of the "has errors" path.
   *
   * See Helios' {@link Program.compile} for more information about compiling Helios programs.
   *
   * import from stellar-contracts/CacheableProgramAPI in a node.js environment
   * to access this method.  In the web environment, that import returns a different
   * class with the same interface.
   */
  async compileWithCache(optimizeOrOptions) {
    const options = typeof optimizeOrOptions === "boolean" ? { optimize: optimizeOrOptions } : optimizeOrOptions;
    const optimize = this.optimizeOptions(optimizeOrOptions);
    const programElements = this.programElements = this.gatherProgramElements();
    const cacheKey = this.getCacheKey(options);
    const fromCache = await this.getFromCache(cacheKey);
    if (fromCache) {
      console.log(`\u{1F422}${this.id}: ${cacheKey}: from cache`);
      return fromCache;
    }
    const weMustCompile = await this.acquireImmediateLock(cacheKey);
    const otherInstanceIsCompiling = !weMustCompile;
    if (otherInstanceIsCompiling) {
      console.log(
        `\u{1F422}${this.id}: waiting for pending compile: ${cacheKey}`
      );
      try {
        const cacheEntry = await this.waitForCaching(cacheKey);
        const program = programFromCacheEntry(cacheEntry);
        this.cacheEntry = deserializeHeliosCacheEntry(cacheEntry);
        debugger;
        return program;
      } catch (e) {
        console.log(
          `\u{1F422}${this.id}: Failed getting cache-awaited program with cacheKey: ${cacheKey}; will compile in-process`
        );
      }
    }
    let lock = weMustCompile || this.locks.get(cacheKey);
    if (!lock) {
      throw new Error(
        `we should have a lock one way or other at this point`
      );
    }
    try {
      console.log(
        `\u{1F422}${this.id}: compiling program with cacheKey: ${cacheKey}`
      );
      const uplcProgram = this.compile(options);
      const cacheEntry = {
        version: "PlutusV2",
        createdBy: this.id,
        optimizeOptions: optimize,
        programElements
      };
      if (uplcProgram.alt) {
        cacheEntry.unoptimized = uplcProgram.alt;
        cacheEntry.unoptimizedIR = uplcProgram.alt.ir;
        cacheEntry.unoptimizedSmap = makeUplcSourceMap({
          term: uplcProgram.alt.root
        }).toJsonSafe();
        cacheEntry.optimized = uplcProgram;
        cacheEntry.optimizedIR = uplcProgram.ir;
        cacheEntry.optimizedSmap = makeUplcSourceMap({
          term: uplcProgram.root
        }).toJsonSafe();
      } else {
        const sourceMap = makeUplcSourceMap({ term: uplcProgram.root });
        if (false == options.optimize) {
          cacheEntry.unoptimized = uplcProgram;
          cacheEntry.unoptimizedIR = uplcProgram.ir;
          cacheEntry.unoptimizedSmap = sourceMap.toJsonSafe();
        } else {
          cacheEntry.optimized = uplcProgram;
          cacheEntry.optimizedIR = uplcProgram.ir;
          cacheEntry.optimizedSmap = sourceMap.toJsonSafe();
        }
      }
      this.cacheEntry = cacheEntry;
      this.storeInCache(cacheKey, cacheEntry);
      return uplcProgram;
    } catch (e) {
      debugger;
      console.log(
        `\u{1F422}${this.id}: compiler cache: throwing compile error: ${e.message} (not caching) (dbpa)`
      );
      this.releaseLock(cacheKey);
      throw e;
    }
  }
  async waitForCaching(cacheKey) {
    return this.acquireLock(cacheKey).then(async (lock) => {
      if (lock) {
        const cached = await this.ifCached(cacheKey);
        if (cached) {
          lock?.release();
          return cached;
        }
        this.locks.set(cacheKey, lock);
        console.log(
          `\u{1F422}${this.id}: waitForCaching: Lock acquired but no cache entry.  Storing lock in map`
        );
        throw new Error(
          `Lock acquired but no cache entry for ${cacheKey}; compute locally then release this.locks[key].`
        );
      }
      throw new Error(
        `Lock for ${cacheKey} not acquired; compute locally (and try to populate the cache if possible)`
      );
    });
  }
  async getFromCache(cacheKey) {
    const cacheEntry = await this.ifCached(cacheKey);
    if (cacheEntry) {
      this.cacheEntry = deserializeHeliosCacheEntry(cacheEntry);
      return programFromCacheEntry(cacheEntry);
    }
    return void 0;
  }
  get subclass() {
    return this.constructor;
  }
  static checkPlatform() {
    var _nodejs = typeof process !== "undefined" && process.versions && process.versions.node;
    if (_nodejs) {
      _nodejs = {
        version: process.versions.node
      };
    }
    var _browser = !_nodejs && (typeof window !== "undefined" || typeof self !== "undefined");
    if (_browser) {
      if (typeof global === "undefined") {
        if (typeof window !== "undefined") {
          global = window;
          _browser.window = true;
        } else if (typeof self !== "undefined") {
          global = self;
          _browser.self = true;
        }
      }
    }
    if (_nodejs) {
      console.log("Node.js detected");
      return "nodejs";
    }
    console.log("Browser env detected");
    return "web";
  }
  /**
   * for vscode index view
   * @internal
   */
  async __vvv_______instanceToStatic() {
  }
  async ifCached(cacheKey) {
    const string = await this.subclass.ifCached(cacheKey);
    if (string) {
      try {
        return JSON.parse(string);
      } catch (e) {
        console.log(
          `  -- \u{1F422}${this.id}: cleaning up invalid cache entry for ${cacheKey}: ${e.message}`
        );
      }
    }
    return null;
  }
  /**
   * Acquires a lock for the given cache key, waiting according to the
   * configured `timeout` for another instance to finish compiling.
   *
   * Throws an error if the timeout expires
   */
  async acquireLock(cacheKey) {
    return this.subclass.acquireLock(cacheKey, this.props).then((lock) => {
      this.locks.set(cacheKey, lock);
      return lock;
    });
  }
  /**
   * Acquires a lock for the given cache key if it can do so immediately.
   * Stores the lock in the instance's lock map.
   */
  async acquireImmediateLock(cacheKey) {
    const lock = await this.subclass.acquireImmediateLock(
      cacheKey,
      this.props
    );
    if (lock) {
      this.locks.set(cacheKey, lock);
    }
    return lock;
  }
  /**
   * Stores a compiled UPLC program in the cache.
   * Requires the lock to exist.
   * Releases the lock after storing the program.
   */
  async storeInCache(cacheKey, value) {
    if (!this.locks.has(cacheKey)) {
      throw new Error(
        `storeInCache: the lock for ${cacheKey} is not present`
      );
    }
    return this.subclass.cacheStore(
      cacheKey,
      stringifyCacheEntry(value),
      value
    ).then(() => {
      this.releaseLock(cacheKey);
    });
  }
  /**
   * Releases the lock for the given cache key.
   * Removes the lock from the instance's lock map.
   * Throws an error if the lock is not found.
   */
  releaseLock(cacheKey) {
    const lock = this.locks.get(cacheKey);
    if (lock) {
      lock.release();
      this.locks.delete(cacheKey);
    } else {
      throw new Error(`releaseLock: no lock found for ${cacheKey}`);
    }
  }
};
function stringifyCacheEntry(entry) {
  return JSON.stringify(
    serializeCacheEntry(entry),
    null,
    2
  );
}
function serializeCacheEntry(entry) {
  const { optimized, unoptimized } = entry;
  return {
    ...entry,
    ...optimized ? { optimized: bytesToHex(optimized.toCbor()) } : {},
    ...unoptimized ? { unoptimized: bytesToHex(unoptimized.toCbor()) } : {}
  };
}
function programFromCacheEntry(fromCache) {
  const {
    optimized,
    optimizedIR,
    unoptimized,
    unoptimizedIR,
    version,
    optimizedSmap,
    unoptimizedSmap,
    // optimizeOptions,
    // createdBy,
    programElements
  } = fromCache;
  if (version !== "PlutusV2") throw new Error(`pv3supportpending`);
  const o = optimized ? decodeUplcProgramV2FromCbor(optimized, {
    ir: optimizedIR,
    sourceMap: optimizedSmap
  }) : void 0;
  const u = unoptimized ? decodeUplcProgramV2FromCbor(unoptimized, {
    ir: unoptimizedIR,
    sourceMap: unoptimizedSmap
  }) : void 0;
  if (o) {
    if (u) {
      return o.withAlt(u);
    }
    return o;
  }
  if (!u) {
    throw new Error(
      `\u{1F422} No optimized or unoptimized program in cache entry: ${fromCache}`
    );
  }
  return u;
}
function deserializeHeliosCacheEntry(entry) {
  const {
    optimized,
    optimizedIR,
    unoptimized,
    unoptimizedIR,
    version,
    optimizedSmap,
    unoptimizedSmap,
    optimizeOptions,
    createdBy,
    programElements
  } = entry;
  return {
    optimized: optimized ? decodeUplcProgramV2FromCbor(optimized) : void 0,
    unoptimized: unoptimized ? decodeUplcProgramV2FromCbor(unoptimized) : void 0,
    optimizedSmap: optimizedSmap || void 0,
    //XXX it's already json-safe. deserializeUplcSourceMap(optimizedSmap).toJsonSafe() : undefined,
    unoptimizedSmap: unoptimizedSmap || void 0,
    //XXX it's already json-safe. deserializeUplcSourceMap(unoptimizedSmap).toJsonSafe(): undefined,
    optimizeOptions,
    version,
    createdBy,
    programElements,
    optimizedIR,
    unoptimizedIR
  };
}

// src/delegation/jsonSerializers.ts
import { bytesToHex as bytesToHex4 } from "@helios-lang/codec-utils";
import { encodeBech32 } from "@helios-lang/crypto";
import "@helios-lang/ledger";
import "@helios-lang/ledger";

// src/UplcConsoleLogger.ts
var UplcConsoleLogger = class {
  didStart = false;
  lines = [];
  lastMessage = "";
  lastReason;
  history = [];
  constructor() {
    this.logPrint = this.logPrint.bind(this);
    this.reset = this.reset.bind(this);
  }
  reset(reason) {
    this.lastMessage = "";
    this.lastReason = reason;
    if (reason == "build") {
      this.lines = [];
      return;
    }
    if (reason == "validate") {
      this.flush();
      return;
    }
  }
  // log(...msgs: string[]) {
  //     return this.logPrint(...msgs);
  // }
  // error(...msgs: string[]) {
  //     return this.logError(...msgs, "\n");
  // }
  // logPrintLn(...msgs: string[]) {
  //     return this.logPrint(...msgs, "\n");
  // }
  logPrint(message, site) {
    if ("string" != typeof message) {
      console.log("wtf");
    }
    if (message && message.at(-1) != "\n") {
      message += "\n";
    }
    this.lastMessage = message;
    this.lines.push(message);
    return this;
  }
  logError(message, stack) {
    this.logPrint("\n");
    this.logPrint(
      "-".repeat((process?.stdout?.columns || 65) - 8)
    );
    this.logPrint("--- \u26A0\uFE0F  ERROR: " + message.trimStart() + "\n");
    this.logPrint(
      "-".repeat((process?.stdout?.columns || 65) - 8) + "\n"
    );
  }
  // printlnFunction(msg) {
  //     console.log("                              ---- println")
  //     this.lines.push(msg);
  //     this.lines.push("\n");
  //     this.flushLines();
  // }
  toggler = 0;
  toggleDots() {
    this.toggler = 1 - this.toggler;
  }
  get isMine() {
    return true;
  }
  resetDots() {
    this.toggler = 0;
  }
  showDot() {
    const s = this.toggler ? "\u2502   \u250A " : "\u2502 \u25CF \u250A ";
    this.toggleDots();
    return s;
  }
  fullHistory() {
    return this.history.join("\n");
  }
  formattedHistory = [];
  fullFormattedHistory() {
    return this.formattedHistory.join("\n");
  }
  flushLines(footerString) {
    let content = [];
    const terminalWidth = process?.stdout?.columns || 65;
    const thisBatch = this.lines.join("").trimEnd();
    this.history.push(thisBatch);
    if (!this.didStart) {
      this.didStart = true;
      content.push("\u256D\u2508\u2508\u2508\u252C" + "\u2508".repeat(terminalWidth - 5));
      this.resetDots();
    } else if (this.lines.length) {
      content.push("\u251C\u2508\u2508\u2508\u253C" + "\u2508".repeat(terminalWidth - 5));
      this.resetDots();
    }
    for (const line of thisBatch.split("\n")) {
      content.push(`${this.showDot()}${line}`);
    }
    content.push(this.showDot());
    if (!this.toggler) {
      content.push(this.showDot());
    }
    if (footerString) {
      content.push(footerString);
    }
    const joined = content.join("\n");
    this.formattedHistory.push(joined);
    console.log(joined);
    this.lines = [];
  }
  finish() {
    this.flushLines(
      "\u2570\u2508\u2508\u2508\u2534" + "\u2508".repeat((process?.stdout?.columns || 65) - 5)
    );
    return this;
  }
  flush() {
    if (this.lines.length) {
      if (this.lastMessage.at(-1) != "\n") {
        this.lines.push("\n");
      }
      this.flushLines();
    }
    return this;
  }
  flushError(message = "") {
    if (this.lastMessage.at(-1) != "\n") {
      this.lines.push("\n");
    }
    if (message.at(-1) == "\n") {
      message = message.slice(0, -1);
    }
    const terminalWidth = process?.stdout?.columns || 65;
    if (message) this.logError(message);
    if (this.lines.length) {
      this.flushLines(
        "\u23BD\u23BC\u23BB\u23BA\u23BB\u23BA\u23BC\u23BC\u23BB\u23BA\u23BB\u23BD\u23BC\u23BA\u23BB\u23BB\u23BA\u23BC\u23BC\u23BB\u23BA".repeat((terminalWidth - 2) / 21)
      );
    }
    return this;
  }
};

// src/StellarTxnContext.ts
import {
  makeTxBuilder,
  makeWalletHelper,
  makeTxChainBuilder
} from "@helios-lang/tx-utils";
import {
  makeAssets as makeAssets2,
  makeTx,
  makeTxBody,
  makeTxCertifyingRedeemer,
  makeTxMintingRedeemer,
  makeTxRewardingRedeemer,
  makeTxSpendingRedeemer,
  makeTxWitnesses
} from "@helios-lang/ledger";
import { bytesToHex as bytesToHex2 } from "@helios-lang/codec-utils";
import { customAlphabet } from "nanoid";

// src/utils.ts
import { isValidUtf8 } from "@helios-lang/codec-utils";
import {
  makeAssets,
  makeValue
} from "@helios-lang/ledger";
var TxNotNeededError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "TxAlreadyPresentError";
  }
};
function checkValidUTF8(data) {
  let i = 0;
  while (i < data.length) {
    if ((data[i] & 128) === 0) {
      i++;
    } else if ((data[i] & 224) === 192) {
      if (i + 1 >= data.length || (data[i + 1] & 192) !== 128) return false;
      i += 2;
    } else if ((data[i] & 240) === 224) {
      if (i + 2 >= data.length || (data[i + 1] & 192) !== 128 || (data[i + 2] & 192) !== 128) return false;
      i += 3;
    } else if ((data[i] & 248) === 240) {
      if (i + 3 >= data.length || (data[i + 1] & 192) !== 128 || (data[i + 2] & 192) !== 128 || (data[i + 3] & 192) !== 128) return false;
      i += 4;
    } else {
      return false;
    }
  }
  return isValidUtf8(data);
}

// src/StellarTxnContext.ts
var nanoid = customAlphabet("0123456789abcdefghjkmnpqrstvwxyz", 12);
var emptyUuts = Object.freeze({});
var StellarTxnContext = class _StellarTxnContext {
  id = nanoid(5);
  inputs = [];
  collateral;
  outputs = [];
  feeLimit;
  state;
  allNeededWitnesses = [];
  otherPartySigners = [];
  parentTcx;
  childReservedUtxos = [];
  parentId = "";
  alreadyPresent = void 0;
  depth = 0;
  // submitOptions?: SubmitOptions
  txb;
  txnName = "";
  withName(name) {
    this.txnName = name;
    return this;
  }
  get wallet() {
    return this.setup.actorContext.wallet;
  }
  get uh() {
    return this.setup.uh;
  }
  get networkParams() {
    return this.setup.networkParams;
  }
  get actorContext() {
    return this.setup.actorContext;
  }
  /**
   * Provides a lightweight, NOT complete, serialization for presenting the transaction context
   * @remarks
   * Serves rendering of the transaction context in vitest
   * @internal
   */
  toJSON() {
    return {
      kind: "StellarTxnContext",
      state: !!this.state ? `{${Object.keys(this.state).join(", ")}}` : void 0,
      inputs: `[${this.inputs.length} inputs]`,
      outputs: `[${this.outputs.length} outputs]`,
      isBuilt: !!this._builtTx,
      hasParent: !!this.parentTcx,
      //@ts-expect-error
      addlTxns: this.state.addlTxns ? [
        //@ts-expect-error
        ...Object.keys(this.state.addlTxns || {})
      ] : void 0
    };
  }
  logger = new UplcConsoleLogger();
  constructor(setup, state = {}, parentTcx) {
    if (parentTcx) {
      console.warn(
        "Deprecated use of 'parentTcx' - use includeAddlTxn() instead\n  ... setup.txBatcher.current holds an in-progress utxo set for all 'parent' transactions"
      );
      throw new Error(`parentTcx used where? `);
    }
    Object.defineProperty(this, "setup", {
      enumerable: false,
      value: setup
    });
    Object.defineProperty(this, "_builtTx", {
      enumerable: false,
      writable: true
    });
    const isMainnet = setup.isMainnet;
    this.isFacade = void 0;
    if ("undefined" == typeof isMainnet) {
      throw new Error(
        "StellarTxnContext: setup.isMainnet must be defined"
      );
    }
    this.txb = makeTxBuilder({
      isMainnet
    });
    this.state = {
      ...state,
      uuts: state.uuts || { ...emptyUuts }
    };
    const currentBatch = this.currentBatch;
    const hasOpenBatch = currentBatch?.isOpen;
    if (!currentBatch || currentBatch.isConfirmationComplete) {
      this.setup.txBatcher.rotate(this.setup.chainBuilder);
    }
    if (!this.setup.isTest && !this.setup.chainBuilder) {
      if (currentBatch.chainBuilder) {
        this.setup.chainBuilder = currentBatch.chainBuilder;
      } else {
        this.setup.chainBuilder = makeTxChainBuilder(
          this.setup.network
        );
      }
    }
    if (parentTcx) {
      debugger;
      throw new Error(`parentTcx used where? `);
    }
    this.parentTcx = parentTcx;
  }
  isFacade;
  facade() {
    if (this.isFacade === false)
      throw new Error(`this tcx already has txn material`);
    if (this.parentTcx)
      throw new Error(`no parentTcx allowed for tcx facade`);
    const t = this;
    t.state.addlTxns = t.state.addlTxns || {};
    t.isFacade = true;
    return this;
  }
  noFacade(situation) {
    if (this.isFacade)
      throw new Error(
        `${situation}: ${this.txnName || "this tcx"} is a facade for nested multi-tx`
      );
    this.isFacade = false;
  }
  withParent(tcx) {
    this.noFacade("withParent");
    this.parentTcx = tcx;
    return this;
  }
  get actorWallet() {
    return this.actorContext.wallet;
  }
  dump(tx) {
    const t = tx || this.builtTx;
    if (t instanceof Promise) {
      return t.then((tx2) => {
        return txAsString(tx2, this.setup.networkParams);
      });
    }
    return txAsString(t, this.setup.networkParams);
  }
  includeAddlTxn(txnName, txInfoIn) {
    const txInfo = {
      ...txInfoIn
    };
    if (!txInfo.id)
      txInfo.id = //@ts-expect-error - the tcx is never there,
      // but including the fallback assignment here for
      // consistency about the policy of syncing to it.
      txInfo.tcx?.id || nanoid(5);
    txInfo.parentId = this.id;
    txInfo.depth = (this.depth || 0) + 1;
    const thisWithMoreType = this;
    if ("undefined" == typeof this.isFacade) {
      throw new Error(
        `to include additional txns on a tcx with no txn details, call facade() first.
   ... otherwise, add txn details first or set isFacade to false`
      );
    }
    thisWithMoreType.state.addlTxns = {
      ...thisWithMoreType.state.addlTxns || {},
      [txInfo.id]: txInfo
    };
    return thisWithMoreType;
  }
  /**
   * @public
   */
  get addlTxns() {
    return this.state.addlTxns || {};
  }
  mintTokens(...args) {
    this.noFacade("mintTokens");
    const [policy, tokens, r = { redeemer: void 0 }] = args;
    const { redeemer } = r;
    if (this.txb.mintPolicyTokensUnsafe) {
      this.txb.mintPolicyTokensUnsafe(policy, tokens, redeemer);
    } else {
      this.txb.mintTokens(policy, tokens, redeemer);
    }
    return this;
  }
  getSeedAttrs() {
    this.noFacade("getSeedAttrs");
    const seedUtxo = this.state.seedUtxo;
    return { txId: seedUtxo.id.txId, idx: BigInt(seedUtxo.id.index) };
  }
  reservedUtxos() {
    this.noFacade("reservedUtxos");
    return this.parentTcx ? this.parentTcx.reservedUtxos() : [
      ...this.inputs,
      this.collateral,
      ...this.childReservedUtxos
    ].filter((x) => !!x);
  }
  utxoNotReserved(u) {
    if (this.collateral?.isEqual(u)) return void 0;
    if (this.inputs.find((i) => i.isEqual(u))) return void 0;
    return u;
  }
  addUut(uutName, ...names) {
    this.noFacade("addUut");
    this.state.uuts = this.state.uuts || {};
    for (const name of names) {
      this.state.uuts[name] = uutName;
    }
    return this;
  }
  addState(key, value) {
    this.noFacade("addState");
    this.state[key] = value;
    return this;
  }
  addCollateral(collateral) {
    this.noFacade("addCollateral");
    if (!collateral.value.assets.isZero()) {
      throw new Error(
        `invalid attempt to add non-pure-ADA utxo as collateral`
      );
    }
    this.collateral = collateral;
    this.txb.addCollateral(collateral);
    return this;
  }
  getSeedUtxoDetails() {
    this.noFacade("getSeedUtxoDetails");
    const seedUtxo = this.state.seedUtxo;
    return {
      txId: seedUtxo.id.txId,
      idx: BigInt(seedUtxo.id.index)
    };
  }
  _txnTime;
  /**
   * Sets a future date for the transaction to be executed, returning the transaction context.  Call this before calling validFor().
   *
   * @remarks Returns the txn context.
   * Throws an error if the transaction already has a txnTime set.
   *
   * This method does not itself set the txn's validity interval.  You MUST combine it with
   * a call to validFor(), to set the txn's validity period.  The resulting transaction will
   * be valid from the moment set here until the end of the validity period set by validFor().
   *
   * This can be used anytime to construct a transaction valid in the future.  This is particularly useful
   * during test scenarios to verify time-sensitive behaviors.
   *
   * In the test environment, the network wil normally be advanced to this date
   * before executing the transaction, unless a different execution time is indicated.
   * Use the test helper's `submitTxnWithBlock(txn, {futureDate})` or `advanceNetworkTimeForTx()` methods, or args to
   * use-case-specific functions that those methods.
   */
  futureDate(date) {
    this.noFacade("futureDate");
    if (this._txnTime) {
      throw new Error(
        "txnTime already set; cannot set futureDate() after txnTime"
      );
    }
    const d = new Date(
      Number(this.slotToTime(this.timeToSlot(BigInt(date.getTime()))))
    );
    console.log("  \u23F0\u23F0 setting txnTime to ", d.toString());
    this._txnTime = d;
    return this;
  }
  assertNumber(obj, msg = "expected a number") {
    if (obj === void 0 || obj === null) {
      throw new Error(msg);
    } else if (typeof obj == "number") {
      return obj;
    } else {
      throw new Error(msg);
    }
  }
  /**
   * Calculates the time (in milliseconds in 01/01/1970) associated with a given slot number.
   * @param slot - Slot number
   */
  slotToTime(slot) {
    let secondsPerSlot = this.assertNumber(
      this.networkParams.secondsPerSlot
    );
    let lastSlot = BigInt(this.assertNumber(this.networkParams.refTipSlot));
    let lastTime = BigInt(this.assertNumber(this.networkParams.refTipTime));
    let slotDiff = slot - lastSlot;
    return lastTime + slotDiff * BigInt(secondsPerSlot * 1e3);
  }
  /**
   * Calculates the slot number associated with a given time.
   * @param time - Milliseconds since 1970
   */
  timeToSlot(time) {
    let secondsPerSlot = this.assertNumber(
      this.networkParams.secondsPerSlot
    );
    let lastSlot = BigInt(this.assertNumber(this.networkParams.refTipSlot));
    let lastTime = BigInt(this.assertNumber(this.networkParams.refTipTime));
    let timeDiff = time - lastTime;
    return lastSlot + BigInt(Math.round(Number(timeDiff) / (1e3 * secondsPerSlot)));
  }
  /**
   * Identifies the time at which the current transaction is expected to be executed.
   * Use this attribute in any transaction-building code that sets date/time values
   * for the transaction.
   * Honors any futureDate() setting or uses the current time if none has been set.
   */
  get txnTime() {
    if (this._txnTime) return this._txnTime;
    const now = Date.now();
    const recent = now - 18e4;
    const d = new Date(
      Number(this.slotToTime(this.timeToSlot(BigInt(recent))))
    );
    console.log("\u23F0\u23F0setting txnTime to ", d.toString());
    return this._txnTime = d;
  }
  _txnEndTime;
  get txnEndTime() {
    if (this._txnEndTime) return this._txnEndTime;
    throw new Error("call [optional: futureDate() and] validFor(durationMs) before fetching the txnEndTime");
  }
  /**
    * Sets an on-chain validity period for the transaction, in miilliseconds
    *
    * @remarks if futureDate() has been set on the transaction, that
    * date will be used as the starting point for the validity period.
    *
    * Returns the transaction context for chaining.
    *
    * @param durationMs - the total validity duration for the transaction.  On-chain
    *  checks using CapoCtx `now(granularity)` can enforce this duration
    */
  validFor(durationMs) {
    this.noFacade("validFor");
    const startMoment = this.txnTime.getTime();
    this._validityPeriodSet = true;
    this.txb.validFromTime(new Date(startMoment)).validToTime(new Date(startMoment + durationMs));
    return this;
  }
  _validityPeriodSet = false;
  txRefInputs = [];
  /**
   * adds a reference input to the transaction context
   * @remarks
   *
   * idempotent version of helios addRefInput()
   *
   * @public
   **/
  addRefInput(input, refScript) {
    this.noFacade("addRefInput");
    if (!input) throw new Error(`missing required input for addRefInput()`);
    if (this.txRefInputs.find((v) => v.id.isEqual(input.id))) {
      console.warn("suppressing second add of refInput");
      return this;
    }
    if (this.inputs.find((v) => v.id.isEqual(input.id))) {
      console.warn(
        "suppressing add of refInput that is already an input"
      );
      return this;
    }
    this.txRefInputs.push(input);
    const v2sBefore = this.txb.v2Scripts;
    if (refScript) {
      this.txb.addV2RefScript(refScript);
    }
    this.txb.refer(input);
    const v2sAfter = this.txb.v2Scripts;
    if (v2sAfter.length > v2sBefore.length) {
      console.log("       --- addRefInput added a script to tx.scripts");
    }
    return this;
  }
  /**
   * @deprecated - use addRefInput() instead.
   */
  addRefInputs(...args) {
    throw new Error(`deprecated`);
  }
  addInput(input, r) {
    this.noFacade("addInput");
    if (r && !r.redeemer) {
      console.log("activity without redeemer tag: ", r);
      throw new Error(
        `addInput() redeemer must match the isActivity type {redeemer: \u2039activity\u203A}
`
        // JSON.stringify(r, delegateLinkSerializer)
      );
    }
    if (input.address.pubKeyHash)
      this.allNeededWitnesses.push(input.address);
    this.inputs.push(input);
    if (this.parentTcx) {
      this.parentTcx.childReservedUtxos.push(input);
    }
    try {
      this.txb.spendUnsafe(input, r?.redeemer);
    } catch (e) {
      debugger;
      throw new Error(
        `addInput: ${e.message}
   ...TODO: dump partial txn from txb above.  Failed TxInput:
` + dumpAny(input)
      );
    }
    return this;
  }
  addOutput(output) {
    this.noFacade("addOutput");
    try {
      this.txb.addOutput(output);
      this.outputs.push(output);
    } catch (e) {
      console.log(
        "Error adding output to txn: \n  | inputs:\n  | " + utxosAsString(this.inputs, "\n  | ") + "\n  | " + dumpAny(this.outputs).split("\n").join("\n  |   ") + "\n... in context of partial tx above: failed adding output: \n  |  ",
        dumpAny(output),
        "\n" + e.message,
        "\n   (see thrown stack trace below)"
      );
      e.message = `addOutput: ${e.message}
   ...see logged details above`;
      throw e;
    }
    return this;
  }
  attachScript(...args) {
    throw new Error(
      `use addScriptProgram(), increasing the txn size, if you don't have a referenceScript.
Use <capo>.txnAttachScriptOrRefScript() to use a referenceScript when available.`
    );
  }
  /**
   * Adds a UPLC program to the transaction context, increasing the transaction size.
   * @remarks
   * Use the Capo's `txnAttachScriptOrRefScript()` method to use a referenceScript
   * when available. That method uses a fallback approach adding the script to the
   * transaction if needed.
   */
  addScriptProgram(...args) {
    this.noFacade("addScriptProgram");
    this.txb.attachUplcProgram(...args);
    return this;
  }
  wasModified() {
    this.txb.wasModified();
  }
  _builtTx;
  get builtTx() {
    this.noFacade("builtTx");
    if (!this._builtTx) {
      throw new Error(`can't go building the tx willy-nilly`);
      return this._builtTx = this.build().then(({ tx }) => {
        return this._builtTx = tx;
      });
    }
    return this._builtTx;
  }
  async addSignature(wallet) {
    this.noFacade("addSignature");
    const builtTx = await this.builtTx;
    const sig = await wallet.signTx(builtTx);
    builtTx.addSignature(sig[0]);
  }
  async findAnySpareUtxos() {
    this.noFacade("findAnySpareUtxos");
    const mightNeedFees = 3500000n;
    const toSortInfo = this.uh.mkUtxoSortInfo(mightNeedFees);
    const notReserved = this.utxoNotReserved.bind(this) || ((u) => u);
    const uh = this.uh;
    return uh.findActorUtxo(
      "spares for tx balancing",
      notReserved,
      {
        wallet: this.wallet,
        dumpDetail: "onFail"
      },
      "multiple"
    ).then(async (utxos) => {
      if (!utxos) {
        throw new Error(
          `no utxos found for spares for tx balancing.  We can ask the user to send a series of 10, 11, 12, ... ADA to themselves or do it automatically`
        );
      }
      const allSpares = utxos.map(toSortInfo).filter(uh.utxoIsSufficient).sort(uh.utxoSortSmallerAndPureADA);
      if (allSpares.reduce(uh.reduceUtxosCountAdaOnly, 0) > 0) {
        return allSpares.filter(uh.utxoIsPureADA).map(uh.sortInfoBackToUtxo);
      }
      return allSpares.map(uh.sortInfoBackToUtxo);
    });
  }
  async findChangeAddr() {
    this.noFacade("findChangeAddr");
    const wallet = this.actorContext.wallet;
    if (!wallet) {
      throw new Error(
        `\u26A0\uFE0F  ${this.constructor.name}: no this.actorContext.wallet; can't get required change address!`
      );
    }
    let unused = (await wallet.unusedAddresses).at(0);
    if (!unused) unused = (await wallet.usedAddresses).at(-1);
    if (!unused)
      throw new Error(
        `\u26A0\uFE0F  ${this.constructor.name}: can't find a good change address!`
      );
    return unused;
  }
  async build({
    signers = [],
    addlTxInfo = {
      description: this.txnName ? ": " + this.txnName : ""
    },
    beforeValidate,
    paramsOverride,
    expectError
  } = {}) {
    this.noFacade("build");
    console.timeStamp?.(`submit() txn ${this.txnName}`);
    console.log("tcx build() @top");
    if (!this._validityPeriodSet) {
      this.validFor(12 * 60 * 1e3);
    }
    let { description } = addlTxInfo;
    if (description && !description.match(/^:/)) {
      description = ": " + description;
    }
    const {
      actorContext: { wallet }
    } = this;
    let walletMustSign = false;
    let tx;
    const logger = this.logger;
    if (wallet || signers.length) {
      console.timeStamp?.(`submit(): findChangeAddr()`);
      const changeAddress = await this.findChangeAddr();
      console.timeStamp?.(`submit(): findAnySpareUtxos()`);
      const spares = await this.findAnySpareUtxos();
      const willSign = [...signers, ...this.allNeededWitnesses].map(
        (addr) => addr.era == "Shelley" && addr.spendingCredential.kind == "PubKeyHash" ? addr.spendingCredential : void 0
      ).filter((pkh) => !!pkh).flat(1);
      console.timeStamp?.(`submit(): addSIgners()`);
      this.txb.addSigners(...willSign);
      const wHelper = wallet && makeWalletHelper(wallet);
      const othersMustSign = [];
      if (wallet && wHelper) {
        for (const a of willSign) {
          if (await wHelper.isOwnAddress(a)) {
            walletMustSign = true;
          } else {
            othersMustSign.push(a);
          }
        }
        this.otherPartySigners = othersMustSign;
        const inputs = this.txb.inputs;
        if (!inputs) throw new Error(`no inputs in txn`);
        for (const input of inputs) {
          if (!await wHelper.isOwnAddress(input.address)) continue;
          this.allNeededWitnesses.push(input.address);
          walletMustSign = true;
          const pubKeyHash = input.address.pubKeyHash;
          if (pubKeyHash) {
            this.txb.addSigners(pubKeyHash);
          } else {
          }
        }
      } else {
        console.warn(
          "txn build: no wallet/helper available for txn signining (debugging breakpoint available)"
        );
        debugger;
      }
      let capturedCosts = {
        total: { cpu: 0n, mem: 0n },
        slush: { cpu: 0n, mem: 0n }
      };
      const inputValues = this.inputs.map((i) => i.value.assets).reduce((a, b) => a.add(b), makeAssets2());
      const outputValues = this.outputs.map((o) => o.value.assets).reduce((a, b) => a.add(b), makeAssets2());
      const mintValues = this.txb.mintedTokens;
      const netTxAssets = inputValues.add(mintValues).subtract(outputValues);
      if (!netTxAssets.isZero()) {
        console.log(
          "tx imbalance=" + dumpAny(netTxAssets, this.networkParams)
        );
      }
      try {
        tx = await this.txb.buildUnsafe({
          changeAddress,
          spareUtxos: spares,
          networkParams: {
            ...this.networkParams,
            ...paramsOverride
          },
          logOptions: logger,
          beforeValidate,
          modifyExBudget: (txi, purpose, index, costs) => {
            capturedCosts[`${purpose} @${1 + index}`] = {
              ...costs
            };
            const cpuSlush = BigInt(350000000n);
            const memSlush = BigInt(430000n);
            capturedCosts.slush.cpu += cpuSlush;
            capturedCosts.slush.mem += memSlush;
            costs.cpu += cpuSlush;
            costs.mem += memSlush;
            capturedCosts.total.cpu += costs.cpu;
            capturedCosts.total.mem += costs.mem;
            if ("minting" == purpose) purpose = "minting ";
            return costs;
          }
        });
        this._builtTx = tx;
        this.txb.validToTime;
      } catch (e) {
        e.message += "; txn build failed (debugging breakpoint available)\n" + (netTxAssets.isZero() ? "" : "tx imbalance=" + dumpAny(netTxAssets, this.networkParams)) + `  inputs: ${dumpAny(this.inputs)}
  outputs: ${dumpAny(this.outputs)}
  mint: ${dumpAny(this.txb.mintedTokens)}
  refInputs: ${dumpAny(this.txRefInputs)}
`;
        logger.logError(`txn build failed: ${e.message}`);
        if (tx) logger.logPrint(dumpAny(tx));
        logger.logError(
          `  (it shouldn't be possible for buildUnsafe to be throwing errors!)`
        );
        logger.flushError();
        throw e;
      }
      if (tx.hasValidationError) {
        const e = tx.hasValidationError;
        let heliosStack = e.stack?.split("\n") || void 0;
        heliosStack = heliosStack?.map((line) => {
          if (line.match(/<helios>@at/)) {
            line = line.replace(
              /<helios>@at /,
              "   ... in helios function "
            ).replace(
              /, \[(.*)\],/,
              (_, bracketed) => ``
              // ` with scope [\n        ${
              //     bracketed.replace(/, /g, ",\n        ")
              // }\n      ]`
            );
          }
          return line;
        });
        debugger;
        const scriptContext = "string" == typeof e ? void 0 : e.scriptContext;
        logger.logError(
          `tx validation failure: 
  \u274C ${//@ts-expect-error
          tx.hasValidationError.message || tx.hasValidationError}
` + (heliosStack?.join("\n") || "")
        );
        logger.flush();
        const ctxCbor = scriptContext?.toCbor();
        const cborHex = ctxCbor ? bytesToHex2(ctxCbor) : "";
        if (!expectError) {
          console.log(
            cborHex ? "------------------- failed ScriptContext as cbor-hex -------------------\n" + cborHex + "\n" : "",
            "------------------- failed tx as cbor-hex -------------------\n" + bytesToHex2(tx.toCbor()),
            "\n------------------^ failed tx details ^------------------\n(debugging breakpoint available)"
          );
        }
      }
      return {
        tx,
        willSign,
        walletMustSign,
        wallet,
        wHelper,
        costs: capturedCosts
      };
    } else {
      throw new Error("no 'actorContext.wallet'; can't make  a txn");
    }
  }
  log(...msgs) {
    if (msgs.length > 1) {
      debugger;
      throw new Error(`no multi-arg log() calls`);
    }
    this.logger.logPrint(msgs[0]);
    return this;
  }
  flush() {
    this.logger.flush();
    return this;
  }
  finish() {
    this.logger.finish();
    return this;
  }
  /**
   * Submits the current transaction and any additional transactions in the context.
   * @remarks
   * To submit only the current transaction, use the `submit()` method.
   *
   * Uses the TxBatcher to create a new batch of transactions.  This new batch
   * overlays a TxChainBuilder on the current network-client, using that facade
   * to provide utxos for chained transactions in the batch.
   *
   * The signers array can be used to add additional signers to the transaction, and
   * is passed through to the submit() for the current txn only; it is not used for
   * any additional transactions.
   *
   * The beforeSubmit, onSubmitted callbacks are used for each additional transaction.
   *
   * beforeSubmit can be used to notify the user of the transaction about to be submitted,
   * and can also be used to add additional signers to the transaction or otherwise modify
   * it (by returning the modified transaction).
   *
   * onSubmitted can be used to notify the user that the transaction has been submitted,
   * or for logging or any other post-submission processing.
   */
  async submitAll(options = {}) {
    const currentBatch = this.currentBatch;
    const hasOpenBatch = currentBatch?.isOpen;
    return this.buildAndQueueAll(options).then(() => {
      return true;
    });
  }
  /**
   * augments a transaction context with a type indicator
   * that it has additional transactions to be submitted.
   * @public
   * @remarks
   * The optional argument can also be used to include additional
   * transactions to be chained after the current transaction.
   */
  withAddlTxns(addlTxns = {}) {
    this.state.addlTxns = this.state.addlTxns || {};
    for (const [name, txn] of Object.entries(addlTxns)) {
      this.includeAddlTxn(name, txn);
    }
    return this;
  }
  async buildAndQueueAll(options = {}) {
    const {
      addlTxInfo = {
        description: this.txnName ? ": " + this.txnName : "\u2039unnamed tx\u203A",
        id: this.id,
        tcx: this
      },
      ...generalSubmitOptions
    } = options;
    if (options.paramsOverride) {
      console.warn(
        "\u26A0\uFE0F  paramsOverride can be useful for extreme cases \nof troubleshooting tx execution by submitting an oversized tx \nwith unoptimized contract scripts having diagnostic print/trace calls\nto a custom preprod node having overloaded network params, thus allowing \nsuch a transaction to be evaluated end-to-end by the Haskell evaluator using \nthe cardano-node's script-budgeting mini-protocol.\n\nThis will cause problems for regular transactions (such as requiring very large collateral)Be sure to remove any params override if you're not dealing with \none of those very special situations. \n"
      );
      debugger;
    }
    if (this.isFacade == false) {
      return this.buildAndQueue({
        ...generalSubmitOptions,
        addlTxInfo
      }).then(() => {
        if (this.state.addlTxns) {
          console.log(
            `\u{1F384}\u26C4\u{1F381} ${this.id}   -- B&QA - registering addl txns`
          );
          return this.queueAddlTxns(options).then(() => {
            return true;
          });
        }
      });
    } else if (this.state.addlTxns) {
      if (this.isFacade) {
        this.currentBatch.$txInfo(this.id)?.transition("isFacade");
      }
      console.log(
        `\u{1F384}\u26C4\u{1F381} ${this.id}   -- B&QA - registering txns in facade`
      );
      return this.queueAddlTxns(generalSubmitOptions).then(() => {
        return true;
      });
    }
    console.warn(`\u26A0\uFE0F  submitAll(): no txns to queue/submit`, this);
    throw new Error(
      `unreachable? -- nothing to do for submitting this tcx`
    );
  }
  get currentBatch() {
    return this.setup.txBatcher.current;
  }
  /**
   * Submits only the current transaction.
   * @remarks
   * To also submit additional transactions, use the `submitAll()` method.
   */
  async buildAndQueue(submitOptions = {}) {
    let {
      signers = [],
      addlTxInfo,
      paramsOverride,
      expectError,
      beforeError,
      beforeValidate,
      whenBuilt,
      fixupBeforeSubmit,
      onSubmitError,
      onSubmitted
    } = submitOptions;
    this.noFacade("submit");
    if (!addlTxInfo) {
      debugger;
      throw new Error(`expecting addlTxInfo to be passed`);
      addlTxInfo = {
        description: this.txnName ? ": " + this.txnName : "\u2039unnamed tx\u203A",
        id: nanoid(5),
        tcx: this
      };
    }
    const {
      logger,
      setup: { network }
    } = this;
    const {
      tx,
      willSign,
      walletMustSign,
      wallet,
      wHelper,
      costs = {
        total: { cpu: 0n, mem: 0n }
      }
    } = await this.build({
      signers,
      paramsOverride,
      addlTxInfo,
      beforeValidate,
      expectError
    });
    let { description, id } = addlTxInfo;
    if (!id) {
      id = addlTxInfo.id = this.id;
    }
    const addlTxInfo2 = {
      ...addlTxInfo
    };
    const txStats = {
      costs,
      wallet,
      walletMustSign,
      wHelper,
      willSign
    };
    const errMsg = tx.hasValidationError && tx.hasValidationError.toString();
    if (errMsg) {
      logger.logPrint(`\u26A0\uFE0F  txn validation failed: ${errMsg}
`);
      logger.logPrint(this.dump(tx));
      this.emitCostDetails(tx, costs);
      logger.flush();
      logger.logError(`FAILED submitting tx: ${description}`);
      logger.logPrint(errMsg);
      if (expectError) {
        logger.logPrint(
          `

\u{1F4A3}\u{1F389} \u{1F4A3}\u{1F389} \u{1F389} \u{1F389} transaction failed (as expected)`
        );
      }
      const txErrorDescription = {
        ...addlTxInfo2,
        tcx: this,
        error: errMsg,
        tx,
        stats: txStats,
        options: submitOptions,
        txCborHex: bytesToHex2(tx.toCbor())
      };
      this.currentBatch.txError(txErrorDescription);
      let errorHandled;
      if (beforeError) {
        errorHandled = await beforeError(txErrorDescription);
      }
      logger.flushError();
      if (errMsg.match(
        /multi:Minting: only dgData activities ok in mintDgt/
      )) {
        console.log(
          `\u26A0\uFE0F  mint delegate for multiple activities should be given delegated-data activities, not the activities of the delegate`
        );
      }
      if (!errorHandled) {
        debugger;
        throw new Error(errMsg);
      }
    }
    for (const pkh of willSign) {
      if (!pkh) continue;
      if (tx.body.signers.find((s) => pkh.isEqual(s))) continue;
      throw new Error(
        `incontheeivable! all signers should have been added to the builder above`
      );
    }
    const txDescr = {
      ...addlTxInfo2,
      tcx: this,
      tx,
      txId: tx.id(),
      options: submitOptions,
      stats: txStats,
      txCborHex: bytesToHex2(tx.toCbor())
    };
    const { currentBatch } = this;
    const txState = currentBatch.$txStates[id];
    logger.logPrint(`tx transcript: ${description}
`);
    logger.logPrint(this.dump(tx));
    this.emitCostDetails(tx, costs);
    logger.flush();
    console.timeStamp?.(`tx: add to current-tx-batch`);
    currentBatch.$addTxns(txDescr);
    this.setup.chainBuilder?.with(txDescr.tx);
    await whenBuilt?.(txDescr);
  }
  emitCostDetails(tx, costs) {
    const { logger } = this;
    const {
      maxTxExCpu,
      maxTxExMem,
      maxTxSize,
      //@ts-expect-error on our synthetic attributes
      origMaxTxSize = maxTxSize,
      //@ts-expect-error on our synthetic attributes
      origMaxTxExMem = maxTxExMem,
      //@ts-expect-error on our synthetic attributes
      origMaxTxExCpu = maxTxExCpu,
      exCpuFeePerUnit,
      exMemFeePerUnit,
      txFeePerByte,
      txFeeFixed
    } = this.networkParams;
    const oMaxSize = origMaxTxSize;
    const oMaxMem = origMaxTxExMem;
    const oMaxCpu = origMaxTxExCpu;
    const { total, ...otherCosts } = costs;
    const txSize = tx.calcSize();
    const txFeeCalc = Number(tx.calcMinFee(this.networkParams));
    const txFee = tx.body.fee;
    const cpuFee = BigInt((Number(total.cpu) * exCpuFeePerUnit).toFixed(0));
    const memFee = BigInt((Number(total.mem) * exMemFeePerUnit).toFixed(0));
    const sizeFee = BigInt(txSize * txFeePerByte);
    const nCpu = Number(total.cpu);
    const nMem = Number(total.mem);
    let refScriptSize = 0;
    for (const anyInput of [...tx.body.inputs, ...tx.body.refInputs]) {
      const refScript = anyInput.output.refScript;
      if (refScript) {
        const scriptSize = refScript.toCbor().length;
        refScriptSize += scriptSize;
      }
    }
    let multiplier = 1;
    let refScriptsFee = 0n;
    let refScriptsFeePerByte = this.networkParams.refScriptsFeePerByte;
    let refScriptCostDetails = [];
    const tierSize = 25600;
    let alreadyConsumed = 0;
    for (let tier = 0; tier * tierSize < refScriptSize; tier += 1, multiplier *= 1.2) {
      const topOfThisTier = (1 + tier) * tierSize;
      const consumedThisTier = Math.min(
        tierSize,
        refScriptSize - alreadyConsumed
      );
      alreadyConsumed += consumedThisTier;
      const feeThisTier = Math.round(
        consumedThisTier * multiplier * refScriptsFeePerByte
      );
      refScriptsFee += BigInt(feeThisTier);
      refScriptCostDetails.push(
        `
      -- refScript tier${1 + tier} (${consumedThisTier} \xD7 ${multiplier}) \xD7${refScriptsFeePerByte} = ${lovelaceToAda(
          feeThisTier
        )}`
      );
    }
    const fixedTxFeeBigInt = BigInt(txFeeFixed);
    const remainderUnaccounted = txFee - cpuFee - memFee - sizeFee - fixedTxFeeBigInt - refScriptsFee;
    if (nCpu > oMaxCpu || nMem > oMaxMem || txSize > oMaxSize) {
      logger.logPrint(
        `\u{1F525}\u{1F525}\u{1F525}\u{1F525}  THIS TX EXCEEDS default (overridden in test env) limits on network params  \u{1F525}\u{1F525}\u{1F525}\u{1F525}
  -- cpu ${intWithGrouping(nCpu)} = ${(100 * nCpu / oMaxCpu).toFixed(1)}% of ${intWithGrouping(
          oMaxCpu
        )} (patched to ${intWithGrouping(maxTxExCpu)})
  -- mem ${nMem} = ${(100 * nMem / oMaxMem).toFixed(
          1
        )}% of ${intWithGrouping(
          oMaxMem
        )} (patched to ${intWithGrouping(maxTxExMem)})
  -- tx size ${intWithGrouping(txSize)} = ${(100 * txSize / oMaxSize).toFixed(1)}% of ${intWithGrouping(
          oMaxSize
        )} (patched to ${intWithGrouping(maxTxSize)})
`
      );
    }
    const scriptBreakdown = Object.keys(otherCosts).length > 0 ? `
    -- per script (with % blame for actual costs):` + Object.entries(otherCosts).map(
      ([key, { cpu, mem }]) => `
      -- ${key}: cpu ${lovelaceToAda(
        Number(cpu) * exCpuFeePerUnit
      )} = ${(Number(cpu) / Number(total.cpu) * 100).toFixed(1)}%, mem ${lovelaceToAda(
        Number(mem) * exMemFeePerUnit
      )} = ${(Number(mem) / Number(total.mem) * 100).toFixed(1)}%`
    ).join("") : "";
    logger.logPrint(
      `costs: ${lovelaceToAda(txFee)}
  -- fixed fee = ${lovelaceToAda(txFeeFixed)}
  -- tx size fee = ${lovelaceToAda(sizeFee)} (${intWithGrouping(txSize)} bytes = ${(Number(1e3 * txSize / oMaxSize) / 10).toFixed(1)}% of tx size limit)
  -- refScripts fee = ${lovelaceToAda(refScriptsFee)}` + refScriptCostDetails.join("") + `
  -- scripting costs
    -- cpu units ${intWithGrouping(total.cpu)} = ${lovelaceToAda(cpuFee)} (${(Number(1000n * total.cpu / BigInt(oMaxCpu)) / 10).toFixed(1)}% of cpu limit/tx)
    -- memory units ${intWithGrouping(total.mem)} = ${lovelaceToAda(memFee)} (${(Number(1000n * total.mem / BigInt(oMaxMem)) / 10).toFixed(1)}% of mem limit/tx)` + scriptBreakdown + `
  -- remainder ${lovelaceToAda(
        remainderUnaccounted
      )} unaccounted-for`
    );
  }
  /**
   * Executes additional transactions indicated by an existing transaction
   * @remarks
   *
   * During the off-chain txn-creation process, additional transactions may be
   * queued for execution.  This method is used to register those transactions,
   * along with any chained transactions THEY may trigger.
   *
   * The TxBatcher and batch-controller classes handle wallet-signing
   * and submission of the transactions for execution.
   * @public
   **/
  async queueAddlTxns(pipelineOptions) {
    const { addlTxns } = this.state;
    if (!addlTxns) return;
    return this.submitTxnChain({
      ...pipelineOptions,
      txns: Object.values(addlTxns)
    });
  }
  /**
   * Resolves a list of tx descriptions to full tcx's, without handing any of their
   * any chained/nested txns.
   * @remarks
   * if submitEach is provided, each txn will be submitted as it is resolved.
   * If submitEach is not provided, then the network must be capable of tx-chaining
   * use submitTxnChain() to submit a list of txns with chaining
   */
  async resolveMultipleTxns(txns, pipelineOptions) {
    for (const [txName, addlTxInfo] of Object.entries(txns)) {
      const { id } = addlTxInfo;
      let txTracker = this.currentBatch.$txInfo(id);
      if (!txTracker) {
        this.currentBatch.$addTxns(addlTxInfo);
        txTracker = this.currentBatch.$txInfo(id);
      }
    }
    await new Promise((res) => setTimeout(res, 5));
    for (const [txName, addlTxInfo] of Object.entries(txns)) {
      const { id, depth, parentId } = addlTxInfo;
      let txTracker = this.currentBatch.$txInfo(id);
      txTracker.$transition("building");
      await new Promise((res) => setTimeout(res, 5));
      const txInfoResolved = addlTxInfo;
      const { txName: txName2, description } = txInfoResolved;
      let alreadyPresent = void 0;
      console.log("  -- before: " + description);
      const tcx = "function" == typeof addlTxInfo.mkTcx ? await (async () => {
        console.log(
          "  creating TCX just in time for: " + description
        );
        const tcx2 = await addlTxInfo.mkTcx();
        tcx2.parentId = parentId || "";
        tcx2.depth = depth;
        if (id) {
          this.currentBatch.changeTxId(id, tcx2.id);
          txInfoResolved.id = tcx2.id;
        } else {
          addlTxInfo.id = tcx2.id;
          console.warn(
            `expected id to be set on addlTxInfo; falling back to JIT-generated id in new tcx`
          );
        }
        return tcx2;
      })().catch((e) => {
        if (e instanceof TxNotNeededError) {
          alreadyPresent = e;
          const tcx2 = new _StellarTxnContext(
            this.setup
          ).withName(
            `addlTxInfo already present: ${description}`
          );
          tcx2.alreadyPresent = alreadyPresent;
          return tcx2;
        }
        throw e;
      }) : (() => {
        console.log(
          "  ---------------- warning!!!! addlTxInfo is already built!"
        );
        debugger;
        throw new Error(" unreachable - right?");
        return addlTxInfo.tcx;
      })();
      if ("undefined" == typeof tcx) {
        throw new Error(
          `no txn provided for addlTx ${txName2 || description}`
        );
      }
      txInfoResolved.tcx = tcx;
      if (tcx.alreadyPresent) {
        console.log(
          "  -- tx effects are already present; skipping: " + txName2 || description
        );
        this.currentBatch.$addTxns(txInfoResolved);
        continue;
      }
      const replacementTcx = pipelineOptions?.fixupBeforeSubmit && await pipelineOptions.fixupBeforeSubmit(
        txInfoResolved
      ) || tcx;
      if (false === replacementTcx) {
        console.log("callback cancelled txn: ", txName2);
        continue;
      }
      if (replacementTcx !== true && replacementTcx !== tcx) {
        console.log(
          `callback replaced txn ${txName2} with a different txn: `,
          dumpAny(replacementTcx)
        );
      }
      const effectiveTcx = true === replacementTcx ? tcx : replacementTcx || tcx;
      txInfoResolved.tcx = effectiveTcx;
      await effectiveTcx.buildAndQueueAll({
        ...pipelineOptions,
        addlTxInfo: txInfoResolved
      });
    }
  }
  /**
   * To add a script to the transaction context, use `attachScript`
   *
   * @deprecated - invalid method name; use `addScriptProgram()` or capo's `txnAttachScriptOrRefScript()` method
   **/
  addScript() {
  }
  async submitTxnChain(options = {
    //@ts-expect-error because the type of this context doesn't
    //   guarantee the presence of addlTxns.  But it might be there!
    txns: this.state.addlTxns || []
  }) {
    const addlTxns = this.state.addlTxns;
    const { txns, onSubmitError } = options;
    const newTxns = txns || addlTxns || [];
    let chainedTxns = [];
    const txChainSubmitOptions = {
      onSubmitError,
      // txns,  // see newTxns
      fixupBeforeSubmit: (txinfo) => {
        options.fixupBeforeSubmit?.(txinfo);
      },
      whenBuilt: async (txinfo) => {
        const { id: parentId, tx } = txinfo;
        const stackedPromise = options.whenBuilt?.(txinfo);
        const more = (
          //@ts-expect-error on optional prop
          txinfo.tcx.state.addlTxns || {}
        );
        console.log("  \u2705 " + txinfo.description);
        const moreTxns = Object.values(more);
        for (const nested of moreTxns) {
          nested.parentId = parentId;
        }
        console.log(
          `\u{1F384}\u26C4\u{1F381} ${parentId}   -- registering nested txns ASAP`
        );
        this.currentBatch.$addTxns(moreTxns);
        await new Promise((res) => setTimeout(res, 5));
        return stackedPromise;
      },
      onSubmitted: (txinfo) => {
        this.setup.network.tick?.(1);
      }
    };
    let chainDepth = 0;
    const isolatedTcx = new _StellarTxnContext(this.setup);
    console.log("\u{1F41D}\u{1F63E}\u{1F43B}\u{1F980}");
    isolatedTcx.id = this.id;
    console.log(
      "at d=0: submitting addl txns: \n" + newTxns.map((t2) => `  \u{1F7E9} ${t2.description}
`).join("")
    );
    const t = isolatedTcx.resolveMultipleTxns(
      newTxns,
      txChainSubmitOptions
    );
    const allPromises = [];
    chainDepth = 0;
    allPromises.push(t);
    await t;
    return;
    while (chainedTxns.length) {
      const nextChain = [];
      chainDepth++;
      for (const { tcx } of chainedTxns) {
      }
      console.log(
        ` \u{1F41E}\u{1F41E}\u{1F41E}\u{1F41E} submitting ${chainedTxns.length} transactions at depth ${chainDepth}`
      );
      console.log(
        chainedTxns.map((t3) => `  \u{1F7E9} ${t3.description}
`).join("")
      );
      const thisBatch = chainedTxns;
      chainedTxns = [];
      const isolatedTcx2 = new _StellarTxnContext(this.setup);
      isolatedTcx2.id = this.id;
      const t2 = isolatedTcx2.resolveMultipleTxns(
        thisBatch,
        txChainSubmitOptions
      );
      allPromises.push(t2);
      await t2;
      console.log(
        "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nSubmitted transactions at depth " + chainDepth
      );
      chainedTxns = nextChain;
    }
    return Promise.all(allPromises);
  }
};

// src/diagnostics.ts
import {
  makeByteArrayData
} from "@helios-lang/uplc";
import {
  makeAddress,
  makeNetworkParamsHelper as makeNetworkParamsHelper2
} from "@helios-lang/ledger";
import { bytesToHex as bytesToHex3 } from "@helios-lang/codec-utils";
function hexToPrintableString(hexStr) {
  let result = "";
  for (let i = 0; i < hexStr.length; i += 2) {
    let hexChar = hexStr.substring(i, i + 2);
    let charCode = parseInt(hexChar, 16);
    if (charCode >= 32 && charCode <= 126) {
      result += String.fromCharCode(charCode);
    } else {
      result += `\u2039${hexChar}\u203A`;
    }
  }
  return result;
}
function displayTokenName(nameBytesOrString) {
  let nameString = "";
  let cip68Tag = "";
  let cip68TagHex = "";
  let checksum = "";
  let tagBytes = "";
  let nameBytesHex = "";
  let nameBytesString = "";
  let isCip68 = false;
  if (typeof nameBytesOrString === "string") {
    nameBytesHex = Buffer.from(encodeUtf8(nameBytesOrString)).toString(
      "hex"
    );
    nameString = nameBytesOrString;
  } else {
    nameBytesHex = Buffer.from(nameBytesOrString).toString("hex");
    nameString = stringToPrintableString(nameBytesOrString);
  }
  if (nameBytesHex.length >= 8) {
    if (nameBytesHex.substring(0, 1) === "0" && nameBytesHex.substring(7, 8) === "0") {
      cip68TagHex = nameBytesHex.substring(1, 5);
      checksum = nameBytesHex.substring(5, 7);
      cip68Tag = parseInt(cip68TagHex, 16).toString();
      nameString = stringToPrintableString(nameBytesOrString.slice(4));
      isCip68 = true;
    }
  }
  if (isCip68) {
    nameString = `\u2039cip68/${cip68Tag}\u203A${nameString}`;
  } else {
    nameString = stringToPrintableString(nameBytesOrString);
  }
  return nameString;
}
function stringToPrintableString(str) {
  if ("string" != typeof str) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(
        new Uint8Array(str)
      );
    } catch (e) {
      str = Buffer.from(str).toString("hex");
    }
  }
  let result = "";
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    if (charCode >= 32 && charCode <= 126) {
      result += str[i];
    } else {
      result += `\u2039${charCode.toString(16)}\u203A`;
    }
  }
  return result;
}
function assetsAsString(a, joiner = "\n    ", showNegativeAsBurn, mintRedeemers) {
  const assets = a.assets;
  return (assets?.map(([policyId, tokenEntries], index) => {
    let redeemerInfo = mintRedeemers?.[index] || "";
    if (redeemerInfo) {
      redeemerInfo = `
        r = ${redeemerInfo} `;
    }
    const tokenString = tokenEntries.map(([nameBytes, count]) => {
      const nameString = displayTokenName(nameBytes);
      const negWarning = count < 1n ? showNegativeAsBurn ? "\u{1F525} " : " \u26A0\uFE0F NEGATIVE\u26A0\uFE0F" : "";
      const burned = count < 1 ? showNegativeAsBurn ? "- BURN \u{1F525} " : "" : "";
      return `${negWarning} ${count}\xD7\u{1F4B4} ${nameString} ${burned}`;
    }).join("+");
    return `\u2991${policyIdAsString(
      policyId
    )} ${tokenString} ${redeemerInfo}\u2992`;
  }) || []).join(joiner);
}
function policyIdAsString(p) {
  const pIdHex = p.toHex();
  const abbrev = abbreviatedDetail(pIdHex);
  return `\u{1F3E6} ${abbrev}`;
}
function lovelaceToAda(lovelace) {
  const asNum = parseInt(lovelace.toString());
  const whole = Math.floor(asNum / 1e6).toFixed(0);
  let fraction = (asNum % 1e6).toFixed(0);
  fraction = fraction.padStart(6, "0");
  const wholeWithSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "_");
  let fractionWithSeparators = fraction.replace(/(\d{3})(?=\d)/g, "$1_").replace(/^-/, "");
  return `${wholeWithSeparators}.${fractionWithSeparators} ADA`;
}
function intWithGrouping(i) {
  const whole = Math.floor(Number(i)).toFixed(0);
  const fraction = Math.abs(Number(i) - Math.floor(Number(i))).toFixed(0);
  const wholeWithSeparators = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "_");
  const fractionWithSeparators = fraction.replace(/(\d{3})(?=\d)/g, "$1_");
  return `${wholeWithSeparators}.${fractionWithSeparators}`;
}
function valueAsString(v) {
  const ada = lovelaceToAda(v.lovelace);
  const assets = assetsAsString(v.assets);
  return [ada, assets].filter((x) => !!x).join(" + ");
}
function txAsString(tx, networkParams) {
  const outputOrder = [
    ["body", "inputs"],
    ["body", "minted"],
    ["body", "outputs"],
    ["body", "refInputs"],
    ["witnesses", "redeemers"],
    ["body", "signers"],
    ["witnesses", "v2refScripts"],
    ["witnesses", "v2scripts"],
    ["witnesses", "nativeScripts"],
    ["body", "collateral"],
    ["body", "collateralReturn"],
    ["body", "scriptDataHash"],
    ["body", "metadataHash"],
    ["witnesses", "signatures"],
    ["witnesses", "datums"],
    ["body", "lastValidSlot"],
    ["body", "firstValidSlot"],
    ["body", "fee"]
  ];
  let details = "";
  if (!networkParams) {
    console.warn(
      new Error(`dumpAny: no networkParams; can't show txn size info!?!`)
    );
  }
  const networkParamsHelper = networkParams ? makeNetworkParamsHelper2(networkParams) : void 0;
  const seenRedeemers = /* @__PURE__ */ new Set();
  const allRedeemers = tx.witnesses.redeemers;
  let hasIndeterminate = false;
  const inputRedeemers = Object.fromEntries(
    allRedeemers.map((x, index) => {
      if (x.kind != "TxSpendingRedeemer") return void 0;
      const { inputIndex } = x;
      const isIndeterminate = inputIndex == -1;
      if (isIndeterminate) hasIndeterminate = true;
      const inpIndex = isIndeterminate ? `\u2039unk${index}\u203A` : inputIndex;
      if (!x.data) debugger;
      const showData = x.data.rawData ? uplcDataSerializer("", x.data.rawData) : x.data?.toString() || "\u2039no data\u203A";
      return [inpIndex, { r: x, display: showData }];
    }).filter((x) => !!x)
  );
  if (hasIndeterminate)
    inputRedeemers["hasIndeterminate"] = {
      r: void 0,
      display: "\u2039unk\u203A"
    };
  const mintRedeemers = Object.fromEntries(
    allRedeemers.map((x) => {
      if ("TxMintingRedeemer" != x.kind) return void 0;
      if ("number" != typeof x.policyIndex) {
        debugger;
        throw new Error(`non-mint redeemer here not yet supported`);
      }
      if (!x.data) debugger;
      const showData = (x.data.rawData ? uplcDataSerializer("", x.data.rawData) : x.data?.toString() || "\u2039no data\u203A") + "\n" + bytesToHex3(x.data.toCbor());
      return [x.policyIndex, showData];
    }).filter((x) => !!x)
  );
  for (const [where, x] of outputOrder) {
    let item = tx[where][x];
    let skipLabel = false;
    if (Array.isArray(item) && !item.length) continue;
    if (!item) continue;
    if ("inputs" == x) {
      item = `
  ${item.map((x2, i) => {
        const { r, display } = inputRedeemers[i] || inputRedeemers["hasIndeterminate"] || {};
        if (!display && x2.datum?.data) debugger;
        tx;
        if (r) seenRedeemers.add(r);
        return txInputAsString(
          x2,
          /* unicode blue arrow right -> */
          `\u27A1\uFE0F  @${1 + i} `,
          i,
          display
          // || "‹failed to find redeemer info›"
        );
      }).join("\n  ")}`;
    }
    if ("refInputs" == x) {
      item = `
  ${item.map((x2) => txInputAsString(x2, "\u2139\uFE0F  ")).join("\n  ")}`;
    }
    if ("collateral" == x) {
      item = item.map((x2) => txInputAsString(x2, "\u{1F52A}")).join("\n    ");
    }
    if ("minted" == x) {
      if (!item.assets.length) {
        continue;
      }
      item = `
   \u2747\uFE0F  ${assetsAsString(
        item,
        "\n   \u2747\uFE0F  ",
        "withBURN",
        mintRedeemers
      )}`;
    }
    if ("outputs" == x) {
      item = `
  ${item.map(
        (x2, i) => txOutputAsString(
          x2,
          `\u{1F539}${i} <-`
        )
      ).join("\n  ")}`;
    }
    if ("firstValidSlot" == x || "lastValidSlot" == x) {
      if (networkParamsHelper) {
        const slotTime = new Date(networkParamsHelper.slotToTime(item));
        const timeDiff = (slotTime.getTime() - Date.now()) / 1e3;
        const sign = timeDiff > 0 ? "+" : "-";
        const timeDiffString = sign + Math.abs(timeDiff).toFixed(1) + "s";
        item = `${item} ${slotTime.toLocaleDateString()} ${slotTime.toLocaleTimeString()} (now ${timeDiffString})`;
      }
    }
    if ("signers" == x) {
      item = item.map((x2) => {
        const hex = x2.toHex();
        return `\u{1F511}#${hex.slice(0, 6)}\u2026${hex.slice(-4)}`;
      });
    }
    if ("fee" == x) {
      item = lovelaceToAda(item);
    }
    if ("collateralReturn" == x) {
      skipLabel = true;
      item = `  ${txOutputAsString(
        item,
        `0  <- \u2753`
      )} conditional: collateral change (returned in case of txn failure)`;
    }
    if ("scriptDataHash" == x) {
      item = bytesToHex3(item);
    }
    if ("datums" == x && !Object.entries(item || {}).length) continue;
    if ("signatures" == x) {
      if (!item) continue;
      item = item.map((s) => {
        const addr = makeAddress(true, s.pubKeyHash);
        const hashHex = s.pubKeyHash.toHex();
        return `\u{1F58A}\uFE0F ${addrAsString(addr)} = \u{1F511}\u2026${hashHex.slice(-4)}`;
      });
      if (item.length > 1) item.unshift("");
      item = item.join("\n    ");
    }
    if ("redeemers" == x) {
      if (!item) continue;
      item = item.map((x2) => {
        const indexInfo = x2.kind == "TxMintingRedeemer" ? `minting policy ${x2.policyIndex}` : `spend txin \u27A1\uFE0F  @${1 + x2.inputIndex}`;
        const showData = seenRedeemers.has(x2) ? "(see above)" : x2.data.fromData ? uplcDataSerializer("", x2.data.fromData) : x2.data.toString();
        return `\u{1F3E7}  ${indexInfo} ${showData}`;
      });
      if (item.length > 1) item.unshift("");
      item = item.join("\n    ");
    }
    if ("v2Scripts" == x) {
      if (!item) continue;
      item = item.map((s) => {
        try {
          const mph = s.mintingPolicyHash.toHex();
          return `\u{1F3E6} ${mph.slice(0, 8)}\u2026${mph.slice(-4)} (minting): ${s.serializeBytes().length} bytes`;
        } catch (e) {
          const vh = s.validatorHash;
          const vhh = vh.toHex();
          const addr = makeAddress(true, vh);
          return `\u{1F4DC} ${vhh.slice(0, 8)}\u2026${vhh.slice(
            -4
          )} (validator at ${addrAsString(addr)}): ${s.serializeBytes().length} bytes`;
        }
      });
      if (item.length > 1) item.unshift("");
      item = item.join("\n    ");
    }
    if ("v2RefScripts" == x) {
      item = `${item.length} - see refInputs`;
    }
    if (!item) continue;
    details += `${skipLabel ? "" : "  " + x + ": "}${item}
`;
  }
  try {
    details += `  txId: ${tx.id().toHex()}`;
    if (networkParams) details += `  

size: ${tx.toCbor().length} bytes`;
  } catch (e) {
    details = details + `(Tx not yet finalized!)`;
    if (networkParams) details += `
  - NOTE: can't determine txn size
`;
  }
  return details;
}
function txInputAsString(x, prefix = "-> ", index, redeemer) {
  const { output: oo } = x;
  const redeemerInfo = redeemer ? `
    r = ${redeemer}` : " \u2039no redeemer\u203A";
  const datumInfo = oo.datum?.kind == "InlineTxOutputDatum" ? datumSummary(oo.datum) : "";
  return `${prefix}${addrAsString(x.address)}${showRefScript(
    oo.refScript
  )} ${valueAsString(x.value)} ${datumInfo} = \u{1F4D6} ${txOutputIdAsString(
    x.id
  )}${redeemerInfo}`;
}
function utxosAsString(utxos, joiner = "\n", utxoDCache) {
  return utxos.map((u) => utxoAsString(u, " \u{1F4B5}", utxoDCache)).join(joiner);
}
function txOutputIdAsString(x, length = 8) {
  return txidAsString(x.txId, length) + `\u{1F539}#${x.index}`;
}
function txidAsString(x, length = 8) {
  const tid = x.toHex();
  return `${tid.slice(0, length)}\u2026${tid.slice(-4)}`;
}
function utxoAsString(x, prefix = "\u{1F4B5}", utxoDCache) {
  return ` \u{1F4D6} ${txOutputIdAsString(x.id)}: ${txOutputAsString(
    x.output,
    prefix,
    utxoDCache,
    x.id
  )}`;
}
function datumSummary(d) {
  if (!d) return "";
  const dh = d.hash.toHex();
  const dhss = `${dh.slice(0, 8)}\u2026${dh.slice(-4)}`;
  if (d.kind == "InlineTxOutputDatum") {
    const attachedData = d.data.rawData;
    if (attachedData) {
      return `
    d\u2039inline:${dhss} - ${uplcDataSerializer("", attachedData)}=${d.toCbor().length} bytes\u203A`;
    } else {
      return `d\u2039inline:${dhss} - ${d.toCbor().length} bytes\u203A`;
    }
  }
  return `d\u2039hash:${dhss}\u2026\u203A`;
}
function showRefScript(rs) {
  if (!rs) return "";
  const hash = rs.hash();
  const hh = bytesToHex3(hash);
  const size = rs.toCbor().length;
  const rshInfo = `${hh.slice(0, 8)}\u2026${hh.slice(-4)}`;
  return ` \u2039\u{1F4C0} refScript\u{1F4DC} ${rshInfo}: ${size} bytes\u203A +`;
}
function txOutputAsString(x, prefix = "<-", utxoDCache, txoid) {
  if (utxoDCache && !txoid) {
    throw new Error(
      `txOutputAsString: must provide txoid when using cache`
    );
  }
  let cache = utxoDCache?.get(txoid);
  if (cache) {
    return `\u267B\uFE0F ${cache} (same as above)`;
  }
  cache = `${prefix} ${addrAsString(x.address)}${showRefScript(
    x.refScript
  )} ${valueAsString(x.value)}`;
  utxoDCache?.set(txoid, cache);
  return `${cache} ${datumSummary(x.datum)}`;
}
function addrAsString(address) {
  const bech32 = address.toString();
  return `${bech32.slice(0, 14)}\u2026${bech32.slice(-4)}`;
}
function byteArrayListAsString(items, joiner = "\n  ") {
  return "[\n  " + items.map((ba) => byteArrayAsString(ba)).join(joiner) + "\n]\n";
}
function byteArrayAsString(ba) {
  return hexToPrintableString(ba.toHex());
}
function dumpAny(x, networkParams, forJson = false) {
  if ("undefined" == typeof x) return "\u2039undefined\u203A";
  if (x?.kind == "Assets") {
    return `assets: ${assetsAsString(x)}`;
  }
  if (Array.isArray(x)) {
    if (!x.length) return "\u2039empty array\u203A";
    const firstItem = x[0];
    if ("number" == typeof firstItem) {
      return "num array: " + byteArrayListAsString([makeByteArrayData(x)]);
    }
    if (firstItem.kind == "TxOutput") {
      return "tx outputs: \n" + x.map((txo) => txOutputAsString(txo)).join("\n");
    }
    if (firstItem.kind == "TxInput") {
      return "utxos: \n" + utxosAsString(x);
    }
    if (firstItem.kind == "ByteArrayData") {
      return "byte array:\n" + byteArrayListAsString(x);
    }
    if ("object" == typeof firstItem) {
      if (firstItem instanceof Uint8Array) {
        return "byte array: " + byteArrayAsString(firstItem);
      }
      return `[` + x.map((item) => JSON.stringify(item, betterJsonSerializer)).join(", ") + `]`;
    }
    console.log("firstItem", firstItem);
    throw new Error(
      `dumpAny(): unsupported array type: ${typeof firstItem}`
    );
  }
  if ("bigint" == typeof x) {
    return x.toString();
  }
  if (x instanceof StellarTxnContext) {
    debugger;
    throw new Error(`use await build() and dump the result instead.`);
  }
  const xx = x;
  if (x.kind == "TxOutput") {
    return txOutputAsString(x);
  }
  if (xx.kind == "Tx") {
    return txAsString(xx, networkParams);
  }
  if (xx.kind == "TxOutputId") {
    return txOutputIdAsString(xx);
  }
  if (xx.kind == "TxId") {
    return txidAsString(xx);
  }
  if (xx.kind == "TxInput") {
    return utxoAsString(xx);
  }
  if (xx.kind == "Value") {
    return valueAsString(xx);
  }
  if (xx.kind == "Address") {
    return addrAsString(xx);
  }
  if (xx.kind == "MintingPolicyHash") {
    return policyIdAsString(xx);
  }
  if (forJson) return xx;
  if ("object" == typeof x) {
    return `{${Object.entries(x).map(([k, v]) => `${k}: ${dumpAny(v, networkParams)}`).join(",\n")}}`;
  }
  debugger;
  return "dumpAny(): unsupported type or library mismatch";
}
var betterJsonSerializer = (key, value) => {
  return dumpAny(value, void 0, true);
};
if ("undefined" == typeof window) {
  globalThis.peek = dumpAny;
} else {
  window.peek = dumpAny;
}

// src/delegation/jsonSerializers.ts
function delegateLinkSerializer2(key, value) {
  if (typeof value === "bigint") {
    return value.toString();
  } else if ("bytes" == key && Array.isArray(value)) {
    return bytesToHex4(value);
  } else if (value?.kind == "Address") {
    return value.toString();
  } else if ("tn" == key && Array.isArray(value)) {
    return decodeUtf8(value);
  }
  if ("capo" == key) return void 0;
  if ("uh" == key) return '"\u2039utxo helper\u203A"';
  if ("capoBundle" == key) return '"\u2039capo bundle\u203A"';
  return value;
}
function uplcDataSerializer(key, value, depth = 0) {
  const indent = "    ".repeat(depth);
  const outdent = "    ".repeat(Math.max(0, depth - 1));
  if (typeof value === "bigint") {
    return `big\u2039${value.toString()}n\u203A`;
  } else if ("bytes" == key && Array.isArray(value)) {
    return abbreviatedDetailBytes2(`bytes\u2039${value.length}\u203A`, value, 40);
  } else if ("string" == typeof value) {
    return `'${value}'`;
  } else if (value === null) {
    return `\u2039null\u203A`;
  } else if ("undefined" == typeof value) {
    return `\u2039und\u203A`;
  } else if (value.kind == "Address") {
    const a = value;
    const cbor = a.toCbor();
    return `\u2039${abbrevAddress(value)}\u203A = ` + abbreviatedDetailBytes2(`cbor\u2039${cbor.length}\u203A:`, cbor, 99);
  } else if (value.kind == "ValidatorHash") {
    return abbreviatedDetailBytes2(
      `script\u2039${value.bytes.length}\u203A`,
      value.bytes
    );
  } else if (value.kind == "MintingPolicyHash") {
    const v = value;
    return `mph\u2039${policyIdAsString(v)}\u203A`;
  } else if (value.kind == "TxOutputId") {
    return `\u2039txoid:${txOutputIdAsString(value, 8)}\u203A`;
  }
  if (value.rawData) {
    return uplcDataSerializer(key, value.rawData, Math.max(depth, 3));
  }
  if (value.kind == "int") {
    const v = value;
    return `IntData\u2039${v.value}\u203A`;
  }
  if (value.kind == "bytes") {
    const v = value;
    return abbreviatedDetailBytes2(
      `ByteArray\u2039${v.bytes.length}\u203A`,
      v.bytes,
      40
    );
  }
  if (value.kind == "Value") {
    return valueAsString(value);
  }
  if (value.kind == "Assets") {
    return `assets:\u2039${assetsAsString(value)}\u203A`;
  }
  if (value.kind == "AssetClass") {
    const ac = value;
    return `assetClass:\u2039${policyIdAsString(ac.mph)} ${displayTokenName(
      ac.tokenName
    )}}\u203A`;
  }
  if (value.kind)
    console.log("info: no special handling for KIND = ", value.kind);
  if ("tn" == key && Array.isArray(value)) {
    return decodeUtf8(value);
  } else if ("number" == typeof value) {
    return value.toString();
  } else if (value instanceof Map) {
    return `map\u2039${value.size}\u203A: { ${uplcDataSerializer(
      "",
      Object.fromEntries(value.entries()),
      Math.max(depth, 3)
    )}    }`;
  } else if (Array.isArray(value) && value.length == 0) {
    return "[]";
  } else if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
    return `${abbreviatedDetailBytes2(`bytes\u2039${value.length}\u203A`, value, 40)}`;
  } else if (Array.isArray(value)) {
    const inner = value.map(
      (v) => uplcDataSerializer("", v, Math.max(depth + 1, 3))
    );
    let extraNewLine2 = "";
    let usesOutdent2 = "";
    const multiLine2 = inner.map((s2) => {
      const hasNewline = s2.trim().includes("\n");
      if (s2.length > 40) {
        extraNewLine2 = "\n";
        usesOutdent2 = outdent;
        return `${indent}${s2}`;
      } else {
      }
      return s2;
    }).join(`, ${extraNewLine2}`);
    return `[ ${extraNewLine2}${multiLine2}${extraNewLine2}${usesOutdent2} ]`;
  }
  if (!value) {
    return JSON.stringify(value);
  }
  const keys = Object.keys(value);
  if (keys.length == 0) {
    return key ? "" : "{}";
  }
  if (keys.length == 1) {
    const singleKey = keys[0];
    const thisValue = value[singleKey];
    let inner = uplcDataSerializer("", thisValue, Math.max(depth, 3)) || "";
    if (Array.isArray(thisValue)) {
      if (!inner.length) {
        inner = "[ \u2039empty list\u203A ]";
      }
    } else {
      if (inner.length) inner = `{ ${inner} }`;
    }
    let s2 = `${singleKey}: ${inner}`;
    return s2;
  }
  let extraNewLine = "";
  let usesOutdent = "";
  let s = keys.map(
    (k) => `${indent}${k}: ${uplcDataSerializer(k, value[k], Math.max(depth + 1, 2))}`
  );
  const multiLineItems = s.map((s2) => {
    if (s2.length < 40 && !s2.includes("\n")) {
      return `${s2}`;
    } else {
      extraNewLine = "\n";
      usesOutdent = outdent;
      return `${s2}`;
    }
    return s2;
  });
  const multiLine = multiLineItems.join(`, ${extraNewLine}`);
  s = `${multiLine}${extraNewLine}${usesOutdent}`;
  if (key) return `{${extraNewLine}${s}}`;
  return `
${s}`;
}
function abbrevAddress(address) {
  return abbreviatedDetail(address.toString(), 12, false);
}
function abbreviatedDetailBytes2(prefix, value, initLength = 8) {
  const hext = bytesToHex4(value);
  const Len = value.length;
  const text = checkValidUTF8(value) ? ` \u2039"${abbreviatedDetail(decodeUtf8(value), initLength)}"\u203A` : ``;
  if (value.length <= initLength) return `${prefix}${hext}${text}`;
  const checksumString = encodeBech32("_", value).slice(-4);
  return `${prefix}${hext.slice(0, initLength)}\u2026 \u2039${checksumString}\u203A${text}`;
}
function abbreviatedDetail(hext, initLength = 8, countOmitted = false) {
  if (process?.env?.EXPAND_DETAIL) {
    return hext;
  } else {
    if (hext.length <= initLength) return hext;
    const omittedCount = countOmitted ? hext.length - initLength - 4 : 0;
    let omittedString = countOmitted ? `\u2039\u2026${omittedCount}\u2026\u203A` : "\u2026";
    if (countOmitted && omittedCount < omittedString.length) {
      omittedString = hext.slice(initLength, -4);
    }
    return `${hext.slice(0, initLength)}${omittedString}${hext.slice(-4)}`;
  }
}

// src/helios/rollupPlugins/heliosRollupBundler.ts
function heliosRollupBundler(opts = {}) {
  const pluginOptions = {
    vite: false,
    project: "",
    compile: false,
    exportPrefix: "",
    ...opts,
    ...{
      include: /.*\.hlb\.[jt]s$/,
      exclude: []
    }
  };
  const tempDir = path6.join(process.cwd(), ".hltemp", "heliosBundler");
  if (!existsSync3(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
  const filterHLB = createFilter2(
    pluginOptions.include,
    pluginOptions.exclude
  );
  const regexCurrentCapoConfig = /^@donecollectively\/stellar-contracts\/currentCapoConfig$/;
  const filterHlbundledImportName = createFilter2(/.*\.hlb\.[jt]s\?bundled/);
  const netName = process.env.CARDANO_NETWORK;
  if (!netName) {
    console.warn(
      "missing CARDANO_NETWORK environment variable; building for 'preprod'"
    );
  }
  const networkId = netName || "preprod";
  const { projectRoot, packageJSON } = StellarHeliosProject.findProjectDetails();
  const thisPackageName = packageJSON.name;
  const packageWithPrefix = `${thisPackageName}/${pluginOptions.exportPrefix}/`.replace(/\/+/g, "/").replace(/\/$/, "");
  const isStellarContracts = "@donecollectively/stellar-contracts" === packageJSON.name;
  const state = {
    capoBundle: void 0,
    // new CapoHeliosBundle(),
    hasExplicitCapoBundle: false,
    hasOtherBundles: false,
    project: new StellarHeliosProject(),
    bundleClassById: {},
    emittedArtifacts: /* @__PURE__ */ new Set()
  };
  const firstImportFrom = {};
  function relativePath(id) {
    return id.replace(`${projectRoot}/`, "");
  }
  const isJavascript = /\.js$/;
  const placeholderSetup = {
    setup: {
      isMainnet: false,
      isPlaceholder: "rollupBundlerPlugin for type-gen"
    }
  };
  return {
    name: "heliosBundler",
    buildEnd: {
      order: "pre",
      handler(error) {
        this.debug(
          "@buildEnd: " + (error ? "error: " + error?.message : "")
        );
        if (pluginOptions.vite) return;
        this.emitFile({
          type: "asset",
          fileName: "needResolverConditions.mjs",
          source: resolverConditionsHelper()
        });
      }
    },
    // ...stellarDeploymentHook({
    //     networkId,
    //     thisPackageName,
    //     isStellarContracts,
    // }),
    resolveId: {
      order: "pre",
      async handler(source, importer, options) {
        const interesting = !!source.match(/CapoMinter\.hlb\./);
        if (source.match(regexCurrentCapoConfig)) {
          throw new Error(`hurray`);
        } else {
        }
        const { project } = state;
        const { isEntry } = options;
        let resolved = null;
        const importerIsJS = !!importer?.match(isJavascript);
        const resolutionTargetIsJS = !!source?.match(isJavascript);
        const importerIsInThisProject = importer?.indexOf(project.projectRoot) === 0;
        if (pluginOptions.vite && importerIsJS && resolutionTargetIsJS && importerIsInThisProject) {
          this.warn(
            `patching up a vitest resolution: ${importer} imported ${source}`
          );
          const sourceWithTs = source.replace(/\.js$/, ".ts");
          resolved = await this.resolve(
            source,
            importer.replace(/\.js$/, ".ts"),
            {
              ...options,
              skipSelf: true
            }
          );
          if (resolved) {
            console.log(
              `heliosBundler: in vitest: resolving ${source} as ${sourceWithTs} for ${importer}`
              // {
              //     source,
              //     importer,
              //     resolved,
              // }
            );
          }
        }
        if (isEntry && !importer) {
          return resolved;
        }
        const r = await this.resolve(source, importer, {
          ...options,
          skipSelf: true
        });
        if (r) resolved = r;
        const id = resolved?.id || source;
        const p = relativePath(id);
        firstImportFrom[p] = firstImportFrom[p] || relativePath(importer);
        if (resolved && id && filterHLB(id)) {
          this.debug(
            `-> resolveId ${source} (from ${relativePath(
              importer
            )})`
          );
          if (interesting) {
            this.debug(
              `resolved absolute HLB id ${id} with options: ` + JSON.stringify(options)
            );
          }
          if (pluginOptions.vite) {
            this.debug(
              `<- resolveId (${relativePath(
                resolved.id
              )}) for Vite`
            );
            return resolved;
          } else {
            const bundledId = `${id}?bundled`;
            const name = resolved.id.replace(
              /.*\/([._a-zA-Z]*)\.hlb\.[jt]s$/,
              "$1"
            );
            const buildGenericArtifacts = !!isStellarContracts;
            const netIdSuffix = buildGenericArtifacts ? "" : `-${networkId}`;
            const packageRelativeName = `contracts${netIdSuffix}/${name}.hlb`;
            const bundledExportName = `${packageWithPrefix}/${packageRelativeName}`;
            if (pluginOptions.emitBundled) {
              const actualResolutionResult = await this.resolve(
                id,
                importer,
                options
              );
              if (actualResolutionResult?.id && !state.emittedArtifacts.has(bundledId)) {
                state.emittedArtifacts.add(bundledId);
                const SomeBundleClass = await rollupCreateHlbundledClass(
                  actualResolutionResult.id,
                  projectRoot
                );
                const isMainnet = networkId === "mainnet";
                state.bundleClassById[id] = SomeBundleClass;
                const hlBundler = SomeBundleClass.create({
                  ...placeholderSetup,
                  placeholderAt: "variant generation"
                });
                if (SomeBundleClass.isCapoBundle) {
                  debugger;
                  if (!state.project.capoBundleName) {
                  } else if (SomeBundleClass.name == state.project.capoBundleName) {
                    const filenameBase = id.replace(
                      /.*\/([^.]+)\..*$/,
                      "$1"
                    );
                    const deployDetailsFile = `./${filenameBase}.hlDeploy.${networkId}.json`;
                    const resolvedDeployConfig = await this.resolve(
                      deployDetailsFile,
                      id,
                      // importer
                      {
                        // attributes: {type: "json" },
                      }
                    );
                    if (!resolvedDeployConfig) {
                      debugger;
                      this.info(
                        `Capo bundle: no deploy config for ${networkId}: ${SomeBundleClass.name}`
                      );
                      state.project.configuredCapo.reject(
                        new Error(
                          "no deployment config"
                        )
                      );
                      debugger;
                    }
                  }
                }
                console.log(
                  `--------------------------------------------------------------
  -- heliosBundler: emitting ${packageRelativeName}
--------------------------------------------------------------
`
                );
                this.emitFile({
                  type: "chunk",
                  id: bundledId,
                  name: packageRelativeName,
                  importer
                  // only valid for emitted assets, not chunks:
                  // originalFileName: resolved.id,
                });
                this.debug(
                  `<- resolveId (${relativePath(
                    resolved.id
                  )}) with artifacts to be emitted`
                );
                return bundledExportName;
              } else if (actualResolutionResult?.id) {
                return bundledExportName;
              }
            }
            this.info(
              `<- resolveId (${relativePath(
                resolved?.id
              )}) without emitted artifacts`
            );
            return bundledExportName;
          }
        } else if (filterHlbundledImportName(id)) {
          this.debug(
            `-> resolveId for emitted bundle: ${relativePath(
              source
            )}
   (from ${relativePath(importer)})`
          );
          if (interesting && process.env.DEBUG) {
            this.warn(
              `resolveId: got HLBundled: ${id}` + JSON.stringify(options)
            );
          }
          const result = await this.resolve(
            id.replace(/\?bundled$/, ""),
            importer,
            {
              ...options,
              skipSelf: true
            }
          );
          if (!result) {
            throw new Error(`can't fail here`);
          }
          this.debug(
            `<- resolveId (${result ? relativePath(result.id) : "\u2039null\u203A"}) for emitted bundle`
          );
          return result;
        } else {
          if (id.match(/hlb/) && !id.match(/hlBundled/) && !id.match(/dist\//)) {
            console.log(
              `resolve: skipping due to filter mismatch (debugging breakpoint available)`,
              { id, importer }
            );
            debugger;
            filterHLB(id);
            return null;
          }
        }
        return resolved;
      }
    },
    load: {
      order: "pre",
      handler: async function(id) {
        const interesting = !!id.match(/\.hlb\./);
        const { project } = state;
        if (filterHlbundledImportName(id)) {
          throw new Error(
            `unused code path for broken emitFile in load `
          );
        }
        if (!filterHLB(id)) {
          if (id.match(/hlb/) && !id.match(/hlBundled/) && !id.match(/dist\//)) {
            console.log(
              `load: skipping due to filter mismatch (debugging breakpoint available)`,
              { id }
            );
            debugger;
            filterHLB(id);
          }
          return null;
        }
        this.debug(`-> load: ${relativePath(id)}`);
        if (interesting && process.env.DEBUG) {
          console.log("    ---- heliosBundler: load", { id });
        }
        let SomeBundleClass = state.bundleClassById[id];
        this.warn(`watch: ${id}`);
        this.addWatchFile(id);
        if (!SomeBundleClass) {
          if (pluginOptions.emitBundled) {
            this.warn(
              `heliosBundler: missing expected bundleClass for ${id} (debugging breakpoint available)`
            );
            debugger;
          }
          SomeBundleClass = await rollupCreateHlbundledClass(
            id,
            projectRoot
          );
        }
        const relativeFilename = path6.relative(projectRoot, id);
        console.log(
          `   \u{1F441}\uFE0F  checking helios bundle ${SomeBundleClass.name} from ${relativeFilename}`
        );
        let bundle = SomeBundleClass.create({
          ...placeholderSetup,
          placeholderAt: "load() before type-gen"
        });
        let program = bundle.program;
        let replacedCapo = false;
        if (SomeBundleClass.isCapoBundle) {
          let skipInstallingThisOne = false;
          const filenameBase = id.replace(/.*\/([^.]+)\..*$/, "$1");
          const deployDetailsFile = `./${filenameBase}.hlDeploy.${networkId}.json`;
          const resolvedDeployConfig = await this.resolve(
            deployDetailsFile,
            id,
            // importer
            {
              // attributes: {type: "json" },
            }
          );
          if (state.hasExplicitCapoBundle) {
            if (!state.capoBundle) {
              throw new Error(
                `redundant unreachable error for typescript narrowing`
              );
            }
            let existingBundleProtoChainNames = [];
            let existingBundleProto = state.capoBundle.constructor;
            while (existingBundleProto) {
              existingBundleProtoChainNames.push(
                existingBundleProto.name
              );
              existingBundleProto = Object.getPrototypeOf(existingBundleProto);
            }
            if (existingBundleProtoChainNames.includes(
              SomeBundleClass.name
            )) {
              skipInstallingThisOne = true;
              console.log(
                `Helios project-loader: not adopting ${SomeBundleClass.name} as the project Capo
  ... because it looks like a base class of already-loaded ${state.capoBundle.constructor.name}`
              );
            } else {
              console.log(
                "have explicitCapoBundle...  AND another, with a different lineage",
                { id, existing: state.capoBundle }
              );
              debugger;
            }
          }
          if (!state.capoBundle) {
            console.log(
              "\nTroubleshooting first .hlb.ts imports?" + [...state.project.bundleEntries.keys()].map(
                (existing) => `    \u2022 ${traceImportPath(existing)}`
              ).join("\n") + "\n"
            );
          } else {
            if (state.hasOtherBundles && !skipInstallingThisOne) {
              throw new Error(`unreachable code path??`);
              let dCur = shortHash(
                JSON.stringify(state.capoBundle?.modules)
              );
              let dNew = shortHash(
                JSON.stringify(
                  SomeBundleClass.prototype.modules
                )
              );
              if (dCur !== dNew) {
                throw new Error(`unreachable code path`);
              } else {
                console.log(
                  "  ---- warning: second capo discovered, though its modules aren't different from default. Generatings its types, but otherwise, Ignoring."
                );
                const newProject = new StellarHeliosProject();
                newProject.loadBundleWithClass(
                  id,
                  SomeBundleClass
                );
                newProject.generateBundleTypes(id);
              }
            }
          }
          state.hasExplicitCapoBundle = true;
          if (!replacedCapo) {
          }
          console.log(
            `   \u{1F441}\uFE0F  checking (Capo) helios bundle ${SomeBundleClass.name}`
          );
          if (!skipInstallingThisOne) {
            state.capoBundle = bundle;
            state.project.loadBundleWithClass(id, SomeBundleClass);
            state.project.generateBundleTypes(id);
          }
        } else {
          state.hasOtherBundles = true;
          if (state.project.bundleEntries.size === 0) {
            const capoName = bundle.capoBundle.constructor.name;
            if (capoName == "CapoHeliosBundle" && !state.capoBundle) {
              console.log(
                `looks like you're using the default Capo bundle! ${capoName}`
              );
              state.project.capoBundleName = capoName;
              debugger;
              state.project.configuredCapo.resolve(void 0);
              state.project.loadBundleWithClass(
                "src/helios/scriptBundling/CapoHeliosBundle.ts",
                bundle.capoBundle.constructor
              );
              this.warn(
                "skipping type-gen for default Capo bundle"
              );
            } else {
              console.log(
                `  -- \u{1F4E6} Your project's Capo bundle: ${capoName}`
              );
              state.project.capoBundleName = capoName;
            }
          }
          state.project.loadBundleWithClass(id, SomeBundleClass);
          try {
            state.project.generateBundleTypes(id);
            this.debug(
              `<- load: ${relativePath(
                id
              )} type-gen side effects done`
            );
            return null;
          } catch (e) {
            if (e.message.match("compilerError")) {
              console.error(e);
              throw new Error(
                `Error in Helios script (see above)`
              );
            }
            console.error(`Error generating types for ${id}:
`, e);
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                reject(
                  new Error(
                    `type-generation error (see above)`
                  )
                );
              }, 5e3);
            });
          }
        }
        this.debug(
          `<- load: ${relativePath(id)} deferred to other plugins`
        );
        return null;
      }
    },
    transform: {
      order: "pre",
      handler: function(code, id) {
        if (!filterHLB(id)) return;
        let looksLikeCapo = code.match(/extends .*Capo.*/);
        if (looksLikeCapo?.[0].match(/usingCapoBundle/))
          looksLikeCapo = null;
        const capoConfigRegex = /^(\s*preConfigured *= )*(?:capoConfigurationDetails)\s*;?\s*$/m;
        const filenameBase = id.replace(/.*\/([^.]+)\..*$/, "$1");
        const deployDetailsFile = `./${filenameBase}.hlDeploy.${networkId}.json`;
        const hlbFile = id.replace(/.*\/([^.]+)\..*$/, "$1");
        const SomeBundleClass = state.bundleClassById[id];
        if (!SomeBundleClass) {
          this.warn(
            `skipping config insertion (no emitBundle in this env?) ${filenameBase}`
          );
          return null;
        }
        if (looksLikeCapo) {
          if (!code.match(capoConfigRegex)) {
            debugger;
            if (SomeBundleClass.isAbstract == true) {
              this.info(
                `${SomeBundleClass.name}: abstract class; skipping config insertion`
              );
              return null;
            }
            const msg = `${SomeBundleClass.name}: this looks like a Capo bundle class without a currentDeploymentConfig
  in ${hlbFile}
  import {currentDeploymentConfig} from "@donecollectively/stellar-contracts"
  ... and add  'preConfigured = capoConfigurationDetails' to your class.
This will use deployment details from ${deployDetailsFile}
  ... or another json file when deploying to a different network`;
            this.warn(msg);
            console.log(colors.red(msg));
            return null;
          }
        } else if (code.match(capoConfigRegex)) {
          this.warn(
            `non-Capo class using currentDeploymentConfig in ${id}`
          );
        } else {
          debugger;
          return transformNonCapo.call(this, code, id);
        }
        return transformCapo.call(
          this,
          code,
          id,
          capoConfigRegex,
          deployDetailsFile
        );
      }
    }
  };
  async function transformCapo(code, id, capoConfigRegex, deployDetailsFile) {
    this.debug(`-> [transform] Capo`);
    const SomeBundleClass = state.bundleClassById[id];
    if (!SomeBundleClass) return null;
    const resolvedDeployConfig = await this.resolve(
      deployDetailsFile,
      id,
      // importer
      {
        // attributes: {type: "json" },
      }
    );
    if (!resolvedDeployConfig) {
      this.warn(
        `no ${networkId} setup for Capo bundle: ${deployDetailsFile}`
      );
      if (SomeBundleClass.name == state.project.capoBundleName) {
        state.project.configuredCapo.resolve(void 0);
      }
    } else {
      this.info("building with Capo setup: " + deployDetailsFile);
      const deployDetailsConfigJSON = readFileSync4(
        resolvedDeployConfig.id
      );
      const deployDetails = JSON.parse(
        deployDetailsConfigJSON.toString() || "{}"
      );
      if (!deployDetails.capo) {
        throw new Error(
          `missing required 'capo' entry in ${resolvedDeployConfig.id}`
        );
      }
      this.warn(`watch2: ${id}`);
      this.addWatchFile(id);
      this.addWatchFile(resolvedDeployConfig.id);
      debugger;
      console.log(deployDetails);
      const capoConfig = parseCapoJSONConfig(deployDetails.capo.config);
      const { seedIndex, seedTxn } = capoConfig;
      const hlBundler = await SomeBundleClass.create({
        deployedDetails: {
          config: capoConfig
        },
        setup: {
          isMainnet: networkId === "mainnet",
          isPlaceholder: `rollupBundlerPlugin for inserting pre-compiled Capo details`
        }
      });
      const { CapoMinterBundle } = await import("@donecollectively/stellar-contracts/contracts/CapoMinter.hlb");
      const minterBundler = await CapoMinterBundle.create({
        params: {
          seedTxn,
          seedIndex
        },
        // deployedDetails: {
        //     config: {
        //         seedTxn,
        //         seedIndex
        //     }
        // },
        setup: {
          isMainnet: networkId === "mainnet",
          isPlaceholder: `rollupBundlerPlugin for inserting pre-compiled Minter details`
        }
      });
      const { programBundle: minterBundle, scriptHash: mph } = await minterBundler.getSerializedProgramBundle();
      const { scriptHash, programBundle } = await hlBundler.getSerializedProgramBundle();
      state.project.configuredCapo.resolve(hlBundler);
      const {
        capo: { config }
      } = deployDetails;
      debugger;
      const typedDeployDetailsText = `{
        capo: {
            programBundle: (${JSON.stringify(programBundle)} as never),
            scriptHash: "${scriptHash}",
            config: this.parseCapoJSONConfig(${JSON.stringify(
        deployDetails.capo.config
      )}),
        },
        minter: {
            programBundle: (${JSON.stringify(minterBundle)} as never),
            scriptHash: ${JSON.stringify(mph)},
            config: this.parseCapoMinterJSONConfig({
                seedTxn: ${JSON.stringify(config.seedTxn)},
                seedIndex: ${JSON.stringify(config.seedIndex)},
            }),
        }
    } 
            static isPreconfigured = true;
            `;
      deployDetails.capo.programBundle = programBundle;
      const s = new MagicString(code);
      s.replace(capoConfigRegex, `$1 ${typedDeployDetailsText}`);
      this.debug(`[transform] <- Capo (w/ deployment)`);
      return {
        code: s.toString(),
        map: s.generateMap({ hires: true })
      };
    }
  }
  async function transformNonCapo(code, id) {
    const s = new MagicString(code);
    const r = filterHLB(id);
    if (!r) {
      return null;
    }
    const regex = /(\s*specializedDelegateModule\s*=\s*)|(static needsSpecializedDelegateModule = false)/m;
    if (code.match(regex)) {
      const SomeBundleClass = state.bundleClassById[id];
      if (!SomeBundleClass) {
        debugger;
        this.warn(
          `not (yet) inserting pre-compiled script for ${id} (dbpa)`
        );
        return null;
      }
      let hlBundler = SomeBundleClass.create({
        setup: {
          isMainnet: networkId === "mainnet",
          isPlaceholder: `rollupBundlerPlugin for inserting pre-compiled script details`
        }
      });
      const precompiledVariants = {};
      if (SomeBundleClass.needsCapoConfiguration) {
        this.debug(`[transform]  -- waiting for configured capo`);
        const configuredCapo = await state.project.configuredCapo.promise.catch((e) => {
          this.debug(
            `failed to load configured Capo bundle: ${e.message}`
          );
          debugger;
          return void 0;
        });
        if (configuredCapo) {
          hlBundler.capoBundle = configuredCapo;
          this.debug(`[transform]  -- configured capo ready`);
        } else {
          this.warn(
            `[transform]  ---- no capo deployment; not inserting compiled script for ${relativePath(
              id
            )}`
          );
          return null;
        }
      }
      let scriptCount = 0;
      let skipCount = 0;
      for (const [variant, params] of Object.entries(
        hlBundler.variants
      )) {
        if (params) {
          const configuredBundle = hlBundler.withSetupDetails({
            params,
            setup: { isMainnet: networkId === "mainnet" }
          });
          const t = await configuredBundle.getSerializedProgramBundle();
          const { scriptHash, programBundle } = t;
          precompiledVariants[variant] = `{
                        programBundle: (${JSON.stringify(
            programBundle
          )} as never),
                        scriptHash: "${scriptHash}",
                        config: ${JSON.stringify(
            configuredBundle.configuredParams,
            delegateLinkSerializer2
          )},
                    }
`;
          scriptCount++;
        } else {
          debugger;
          if (state.capoBundle?.configuredUplcParams) {
            this.warn(
              `variant '${variant}': derive params from capo? (dbpa)`
            );
          } else if (state.capoBundle) {
            this.warn(
              `variant '${variant}': missing baseParams; skipping (dbpa)`
            );
          } else {
            this.warn(`wait for capoBundle?`);
          }
          skipCount++;
        }
      }
      const skipMsg = skipCount > 0 ? ` (+${skipCount} skipped)` : ``;
      if (!scriptCount) {
        this.debug(
          `[transform] <- skipping script insertion for non-capo ${skipMsg}`
        );
        return null;
      } else {
        const precompiled = `    preCompiled = ({
${Object.entries(
          precompiledVariants
        ).map(([vName, vSrc]) => `${vName}: ${vSrc},
`).join("")}    })

`;
        s.replace(
          regex,
          (match, specializedDelegateModule, getMain) => {
            this.debug(
              `[transform] -- inserting pre-compiled script`
            );
            const existing = specializedDelegateModule || getMain;
            return `${precompiled}   ${existing}`;
          }
        );
        this.debug(
          `[transform] <- non-capo w/ ${scriptCount} compiled script(s)${skipMsg}`
        );
        return {
          code: s.toString(),
          map: s.generateMap({ hires: true })
        };
      }
    }
    throw new Error(
      `bundle module format error
 ... non-Capo must define 'specializedDelegateModule = ...
 ... or EXACTLY AND VERBATIM: \`static needsSpecializedDelegateModule = false\``
    );
    return null;
  }
  function traceImportPath(existing) {
    let trace = [];
    for (let p = existing; p; p = firstImportFrom[p]) {
      trace.push(p);
    }
    const importTrace = trace.join("\n      imported by ");
    return importTrace;
  }
  function shortHash(str) {
    return bytesToHex5(blake2b2(encodeUtf8(str)).slice(0, 5));
  }
  function resolverConditionsHelper() {
    return `export default class needResolveConditions {
    constructor() {
        throw new Error(\`

This app tried to load a deployed on-chain script bundle, without
having indicated a network-id.

To resolve deployed on-chain script bundles, you need to specify
custom resolver condition to connect the specific deployment
environment with the pre-compiled scripts for that environment.

In Next.js, try something like this in next.config.js:
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true
  },
  webpack: (config) => {
    config.resolve.conditionNames.push(\`network-\${CARDANO_NETWORK || "preprod"}\`);
    return config;
  }
    ...
                        \`)
                    }

In VIte, use its resolve.conditions setting.
- see https://vite.dev/config/shared-options.html#resolve-conditions
                 
export default defineConfig({
     ...
     resolve: {
         conditions: [
             \`network-\${process.env.CARDANO_NETWORK || "preprod"}\`
         ]
 })

More about conditional exports and the resolver conditions they match:

https://nodejs.org/docs/latest-v22.x/api/packages.html#conditional-exports
\`  
}
}
`;
  }
}
export {
  heliosRollupBundler,
  heliosRollupLoader
};
//!!! todo work on this more
//!!! if we could access the inputs and outputs in a building Tx,
//!!! todo: deal with "native-script" by traversing its
//!!! todo: come back to this later.  Blockfrost's endpoint for this
//!!! remove because it's already done in the constructor?
//!!! ^^^ remove?
//!!! was just buildAndQueue, but that was executing
//!!! todo: improve interface of tx so useful things have a non-private api
//!!! todo: get back to type-safety in this diagnostic suite
//!!! todo: group collateral with inputs and reflect it being spent either way,
//!!! todo: move collateral to bottom with collateralReturn,
//!!! todo: augment with mph when that's available from the Activity.
//# sourceMappingURL=rollup-plugins.mjs.map
