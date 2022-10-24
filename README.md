# 🚧 mongzod 🚧

Lightweight MongoDB typescript library that uses [zod](https://zod.dev) and mongo's own built-in [JSON schema validator](https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/#json-schema)

```sh
pnpm add mongzod
```

```ts
import { Prop, buildModel } from "mongzod";

class User {
  @Prop.String()
  @Prop.Index()
  @Prop.Details({ description: "User's name" })
  name: string;

  @Prop.String({ format: "email" })
  @Prop.Index({ unique: true })
  @Prop.Details({ optional: true, description: "User's email" })
  email?: string;
}

const UserModel = buildModel(User);

const user = UserModel.parse({ name: "John" });
UserModel.safeParse({ name: null }); // { success: false, error: ... }

// ...

ensureValidator(db, "users", { $jsonSchema: UserModel.toJSON() });
ensureIndexes(db, "users", UserModel.getIndexes());
```

## Contributions

Want to help develop this library? Create an pull request and get started!
