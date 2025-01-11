import * as YAML from 'yaml';
import * as fs from 'fs';
import Ajv from "ajv"
import * as schema from '../schema/schema.v0.json'
import { assert } from 'chai';

const ajv = new Ajv({
    allowUnionTypes: true,
    strict: false,
})

const validate = ajv.compile(schema)

const testFiles = [
    './tests/examples/basic.yaml',
    './tests/examples/more.yaml',
    './tests/examples/extreme.yaml',
]

const parseFile = (file: string) => {
    const fileContent = fs.readFileSync(file, 'utf-8');
    const parsed = YAML.parseAllDocuments(fileContent) as any[];
    return {
        config: parsed[0].toJSON(),
        content: parsed[1].toJSON()
    }
}


for (const file of testFiles) {
    it(`should validate the config of ${file}`, () => {
        const config = parseFile(file).config

        const valid = validate(config)
        try {
            assert.isTrue(valid)
        } catch (e) {
            // For more useful output
            throw new Error(JSON.stringify(validate.errors, null, 2))
        }
    })
    it(`should validate the content of ${file}`, () => {
        const content = parseFile(file).content

        const valid = validate(content)
        try {
            assert.isTrue(valid)
        } catch (e) {
            // For more useful output
            throw new Error(JSON.stringify(validate.errors, null, 2))
        }
    })
}
