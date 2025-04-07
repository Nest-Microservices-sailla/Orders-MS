import 'dotenv/config'
import * as joi from 'joi'

interface EnvVars {
    PORT: number
    NODE_ENV: string
    //DATABASE_URL: string
}

// Validar mediante esquema
const envsSchema = joi.object({
    PORT: joi.number().required(),
    NODE_ENV: joi.string().required(),
    //DATABASE_URL: joi.string().required()
})
.unknown(true)

const { error, value} = envsSchema.validate(process.env)
if (error) {
    throw new Error(`Config validation error: ${error.message}`)
}

const envVars: EnvVars = value

export const envs = {
    port: envVars.PORT,
    node_env: envVars.NODE_ENV,
    //databaseUrl: envVars.DATABASE_URL,
}
