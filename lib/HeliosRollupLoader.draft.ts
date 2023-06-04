// started from https://github.com/gregberge/svgr/blob/main/packages/rollup/src/index.ts
//  - can't understand Program import
//  - doesn't understand helios imports.

// consider using https://github.com/GiG/rollup-plugin-webpack-loader
// along the existing Helios webpack-loader


import * as fs from 'fs'
import { createFilter, CreateFilter } from '@rollup/pluginutils'
// import { transformAsync, createConfigItem } from '@babel/core'
import type { PluginImpl } from 'rollup'

// const babelOptions = {
//   babelrc: false,
//   configFile: false,
//   presets: [
//     createConfigItem(presetReact, { type: 'preset' }),
//     createConfigItem([presetEnv, { modules: false }], { type: 'preset' }),
//   ],
//   plugins: [createConfigItem(pluginTransformReactConstantElements)],
// }

// const typeScriptBabelOptions = {
//   ...babelOptions,
//   presets: [
//     ...babelOptions.presets,
//     createConfigItem(
//       [presetTS, { allowNamespaces: true, allExtensions: true, isTSX: true }],
//       { type: 'preset' },
//     ),
//   ],
// }
export interface Options {
    include?: Parameters<CreateFilter>[0]
    exclude?: Parameters<CreateFilter>[1]
    //   babel?: boolean
}

const plugin: PluginImpl<Options> = (options = {}) => {
//   const EXPORT_REGEX = /(module\.exports *= *|export default)/
  const filter = createFilter(options.include || '**/*.hl', options.exclude)
//   const { babel = true } = options

  return {
    name: 'helios',
    async transform(data, id) {
      if (!filter(id)) return null
      console.log('------------------------ 1', id);
      if (id.slice(-3) !== '.hl') return null

      console.log('------------------------ 2');
      const load = fs.readFileSync(id, 'utf8')
      const escaped = load.replaceAll(/\`/g, "\\`")
      const jsCode = `
import { Program } from "@hyperionbt/helios";
export const contract = new Program(\`${escaped}
\`);`;

      console.log('------------------------ 3', jsCode);
      //     filePath: id,
    //     caller: {
    //       name: '@svgr/rollup',
    //       previousExport,
    //       defaultPlugins: [svgo, jsx],
    //     },
    //   })

    //   if (babel) {
    //     const result = await transformAsync(
    //       jsCode,
    //       options.typescript ? typeScriptBabelOptions : babelOptions,
    //     )
    //     if (!result?.code) {
    //       throw new Error(`Error while transforming using Babel`)
    //     }
    //     return { code: result.code, map: null }
    //   }

      return {
        ast: {
          type: 'Program',
          start: 0,
          end: 0,
          sourceType: 'module',
          body: [],
        },
        code: jsCode,
        map: null,
      }
    },
  }
}

export default plugin