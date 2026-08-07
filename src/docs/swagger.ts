const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

const bearerAuth = [{ bearerAuth: [] }];

export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Home Recipes API",
    version: "1.0.0",
    description:
      "REST API for the Home Recipes platform (recipes & conservation). " +
      "Error responses are never localized — the frontend translates user-facing text " +
      "from `errorCode`; `message` is an English description for logs/debugging.",
  },
  servers: [
    { url: "https://home-recipes-back.onrender.com/api", description: "Production" },
    { url: "http://localhost:3000/api", description: "Local development" },
  ],
  tags: [
    { name: "Auth", description: "Registration, login, sessions" },
    { name: "Users", description: "Current user's own profile" },
    { name: "Categories", description: "Recipe/conservation categories" },
    { name: "Ingredients", description: "Ingredient dictionary" },
    { name: "Recipes", description: "Recipes CRUD, search, favorites" },
    { name: "Admin", description: "Admin-only user management" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          status: { type: "integer", example: 400 },
          errorCode: { type: "string", example: "VALIDATION_ERROR" },
          message: { type: "string", example: "Human-readable description for logs" },
          data: { type: "object", nullable: true, example: null },
        },
      },
      User: {
        type: "object",
        properties: {
          _id: { type: "string", example: "665f1c2b8e1d2c0012a3b456" },
          name: { type: "string", example: "Andross" },
          email: { type: "string", format: "email", example: "user@example.com" },
          avatarUrl: { type: "string", nullable: true },
          role: { type: "string", enum: ["user", "admin"] },
          isBlocked: { type: "boolean" },
          isVerified: { type: "boolean" },
          favorites: { type: "array", items: { type: "string" } },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthTokens: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
        },
      },
      Category: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string", example: "Soups" },
          group: { type: "string", enum: ["recipes", "conservation"] },
          imageUrl: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Ingredient: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string", example: "Potato" },
          imageUrl: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      RecipeIngredientInput: {
        type: "object",
        required: ["ingredient", "amount"],
        properties: {
          ingredient: { type: "string", description: "Ingredient id" },
          amount: { type: "string", example: "3 pcs" },
        },
      },
      Recipe: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          group: { type: "string", enum: ["recipes", "conservation"] },
          category: { type: "string", description: "Category id (or populated Category object on GET /recipes/{id})" },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ingredient: { type: "string", description: "Ingredient id (or populated Ingredient object on GET /recipes/{id})" },
                amount: { type: "string" },
              },
            },
          },
          steps: { type: "array", items: { type: "string" } },
          cookTime: { type: "integer", nullable: true, example: 30 },
          imageUrl: { type: "string", nullable: true },
          owner: { type: "string", description: "User id (or { _id, name } on GET /recipes/{id})" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      RecipeListResult: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Recipe" } },
          page: { type: "integer", example: 1 },
          perPage: { type: "integer", example: 12 },
          totalItems: { type: "integer", example: 42 },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new account",
        description: "Creates an unverified user and sends a verification email. No auto-login.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", minLength: 2, maxLength: 100 },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8, maxLength: 72 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Registered, verification email sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "integer" }, message: { type: "string" } },
                },
              },
            },
          },
          "400": errorResponse("Validation error"),
          "409": errorResponse("EMAIL_ALREADY_EXISTS"),
          "429": errorResponse("TOO_MANY_REQUESTS"),
        },
      },
    },
    "/auth/verify-email/{token}": {
      get: {
        tags: ["Auth"],
        summary: "Verify email by token",
        parameters: [
          { name: "token", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Email verified" },
          "400": errorResponse("VERIFICATION_TOKEN_EXPIRED"),
          "404": errorResponse("INVALID_VERIFICATION_TOKEN"),
          "429": errorResponse("TOO_MANY_REQUESTS"),
        },
      },
    },
    "/auth/resend-verification": {
      post: {
        tags: ["Auth"],
        summary: "Resend the verification email",
        description: "Rate-limited to once per 60 seconds per email.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Verification email sent" },
          "404": errorResponse("USER_NOT_FOUND"),
          "409": errorResponse("EMAIL_ALREADY_VERIFIED"),
          "429": errorResponse("VERIFICATION_EMAIL_RATE_LIMITED or TOO_MANY_REQUESTS"),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Logged in",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/User" },
                        accessToken: { type: "string" },
                        refreshToken: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": errorResponse("INVALID_CREDENTIALS"),
          "403": errorResponse("ACCOUNT_BLOCKED or ACCOUNT_NOT_VERIFIED"),
          "429": errorResponse("TOO_MANY_REQUESTS"),
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate access/refresh tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "New token pair",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "integer" },
                    data: { $ref: "#/components/schemas/AuthTokens" },
                  },
                },
              },
            },
          },
          "401": errorResponse("INVALID_REFRESH_TOKEN or SESSION_NOT_FOUND"),
          "429": errorResponse("TOO_MANY_REQUESTS"),
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out (deletes the current session)",
        security: bearerAuth,
        responses: {
          "204": { description: "Logged out" },
          "401": errorResponse("Unauthorized"),
          "429": errorResponse("TOO_MANY_REQUESTS"),
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get the current user",
        security: bearerAuth,
        responses: {
          "200": {
            description: "Current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "integer" },
                    data: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } } },
                  },
                },
              },
            },
          },
          "401": errorResponse("Unauthorized"),
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update the current user's name",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string", minLength: 2, maxLength: 100 } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated user" },
          "400": errorResponse("Validation error"),
          "401": errorResponse("Unauthorized"),
        },
      },
    },
    "/users/me/avatar": {
      patch: {
        tags: ["Users"],
        summary: "Replace the current user's avatar",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["avatar"],
                properties: { avatar: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated user with new avatarUrl" },
          "400": errorResponse("AVATAR_FILE_REQUIRED / INVALID_FILE_TYPE / FILE_TOO_LARGE"),
          "401": errorResponse("Unauthorized"),
        },
      },
    },
    "/categories": {
      get: {
        tags: ["Categories"],
        summary: "List categories",
        parameters: [
          {
            name: "group",
            in: "query",
            schema: { type: "string", enum: ["recipes", "conservation"] },
          },
        ],
        responses: {
          "200": {
            description: "Category list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        categories: { type: "array", items: { $ref: "#/components/schemas/Category" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Create a category (admin only)",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name", "group"],
                properties: {
                  name: { type: "string" },
                  group: { type: "string", enum: ["recipes", "conservation"] },
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Category created" },
          "400": errorResponse("Validation error"),
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("ADMIN_ACCESS_REQUIRED"),
        },
      },
    },
    "/categories/{id}": {
      patch: {
        tags: ["Categories"],
        summary: "Update a category (admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  group: { type: "string", enum: ["recipes", "conservation"] },
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Category updated" },
          "400": errorResponse("Validation error / INVALID_ID"),
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("ADMIN_ACCESS_REQUIRED"),
          "404": errorResponse("CATEGORY_NOT_FOUND"),
        },
      },
      delete: {
        tags: ["Categories"],
        summary: "Delete a category (admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Category deleted" },
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("ADMIN_ACCESS_REQUIRED"),
          "404": errorResponse("CATEGORY_NOT_FOUND"),
          "409": errorResponse("CATEGORY_IN_USE — recipes still reference this category"),
        },
      },
    },
    "/ingredients": {
      get: {
        tags: ["Ingredients"],
        summary: "List ingredients",
        parameters: [{ name: "search", in: "query", schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Ingredient list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        ingredients: { type: "array", items: { $ref: "#/components/schemas/Ingredient" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Ingredients"],
        summary: "Create an ingredient (admin only)",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Ingredient created" },
          "400": errorResponse("Validation error"),
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("ADMIN_ACCESS_REQUIRED"),
          "409": errorResponse("INGREDIENT_ALREADY_EXISTS"),
        },
      },
    },
    "/ingredients/{id}": {
      patch: {
        tags: ["Ingredients"],
        summary: "Update an ingredient (admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Ingredient updated" },
          "400": errorResponse("Validation error / INVALID_ID"),
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("ADMIN_ACCESS_REQUIRED"),
          "404": errorResponse("INGREDIENT_NOT_FOUND"),
          "409": errorResponse("INGREDIENT_ALREADY_EXISTS"),
        },
      },
      delete: {
        tags: ["Ingredients"],
        summary: "Delete an ingredient (admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Ingredient deleted" },
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("ADMIN_ACCESS_REQUIRED"),
          "404": errorResponse("INGREDIENT_NOT_FOUND"),
          "409": errorResponse("INGREDIENT_IN_USE — recipes still reference this ingredient"),
        },
      },
    },
    "/recipes": {
      get: {
        tags: ["Recipes"],
        summary: "List recipes",
        parameters: [
          { name: "group", in: "query", schema: { type: "string", enum: ["recipes", "conservation"] } },
          { name: "category", in: "query", schema: { type: "string" }, description: "Category id" },
          { name: "ingredient", in: "query", schema: { type: "string" }, description: "Ingredient id" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Case-insensitive title search" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "perPage", in: "query", schema: { type: "integer", default: 12 } },
        ],
        responses: {
          "200": {
            description: "Paginated recipe list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "integer" },
                    data: { $ref: "#/components/schemas/RecipeListResult" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Recipes"],
        summary: "Create a recipe",
        description: "Owner is taken from the access token. `ingredients`/`steps` are JSON-encoded strings when sent as multipart/form-data alongside an image.",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["title", "group", "category", "steps"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  group: { type: "string", enum: ["recipes", "conservation"] },
                  category: { type: "string", description: "Category id" },
                  ingredients: {
                    type: "string",
                    description: 'JSON string, e.g. \'[{"ingredient":"<id>","amount":"3 pcs"}]\'',
                  },
                  steps: { type: "string", description: 'JSON string, e.g. \'["Peel", "Boil"]\'' },
                  cookTime: { type: "integer" },
                  image: { type: "string", format: "binary" },
                },
              },
            },
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "group", "category", "steps"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  group: { type: "string", enum: ["recipes", "conservation"] },
                  category: { type: "string" },
                  ingredients: { type: "array", items: { $ref: "#/components/schemas/RecipeIngredientInput" } },
                  steps: { type: "array", items: { type: "string" } },
                  cookTime: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Recipe created" },
          "400": errorResponse("Validation error / CATEGORY_GROUP_MISMATCH"),
          "401": errorResponse("Unauthorized"),
          "404": errorResponse("CATEGORY_NOT_FOUND / INGREDIENT_NOT_FOUND"),
        },
      },
    },
    "/recipes/own": {
      get: {
        tags: ["Recipes"],
        summary: "List the current user's own recipes",
        security: bearerAuth,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "perPage", in: "query", schema: { type: "integer", default: 12 } },
        ],
        responses: {
          "200": {
            description: "Paginated own recipes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "integer" },
                    data: { $ref: "#/components/schemas/RecipeListResult" },
                  },
                },
              },
            },
          },
          "401": errorResponse("Unauthorized"),
        },
      },
    },
    "/recipes/favorites": {
      get: {
        tags: ["Recipes"],
        summary: "List the current user's favorite recipes",
        security: bearerAuth,
        responses: {
          "200": {
            description: "Favorite recipes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "integer" },
                    data: {
                      type: "object",
                      properties: { recipes: { type: "array", items: { $ref: "#/components/schemas/Recipe" } } },
                    },
                  },
                },
              },
            },
          },
          "401": errorResponse("Unauthorized"),
        },
      },
    },
    "/recipes/favorites/{id}": {
      post: {
        tags: ["Recipes"],
        summary: "Add a recipe to favorites",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Recipe id" }],
        responses: {
          "200": { description: "Added to favorites (idempotent)" },
          "401": errorResponse("Unauthorized"),
          "404": errorResponse("RECIPE_NOT_FOUND"),
        },
      },
      delete: {
        tags: ["Recipes"],
        summary: "Remove a recipe from favorites",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Recipe id" }],
        responses: {
          "204": { description: "Removed from favorites (idempotent)" },
          "401": errorResponse("Unauthorized"),
        },
      },
    },
    "/recipes/{id}": {
      get: {
        tags: ["Recipes"],
        summary: "Get a recipe by id",
        description: "Populates category, ingredients.ingredient and owner (name only).",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Recipe detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "integer" },
                    data: { type: "object", properties: { recipe: { $ref: "#/components/schemas/Recipe" } } },
                  },
                },
              },
            },
          },
          "400": errorResponse("INVALID_ID"),
          "404": errorResponse("RECIPE_NOT_FOUND"),
        },
      },
      patch: {
        tags: ["Recipes"],
        summary: "Update a recipe (owner or admin)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  group: { type: "string", enum: ["recipes", "conservation"] },
                  category: { type: "string" },
                  ingredients: { type: "string", description: "JSON string" },
                  steps: { type: "string", description: "JSON string" },
                  cookTime: { type: "integer" },
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Recipe updated" },
          "400": errorResponse("Validation error / CATEGORY_GROUP_MISMATCH"),
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("RECIPE_ACCESS_DENIED"),
          "404": errorResponse("RECIPE_NOT_FOUND / CATEGORY_NOT_FOUND / INGREDIENT_NOT_FOUND"),
        },
      },
      delete: {
        tags: ["Recipes"],
        summary: "Delete a recipe (owner or admin)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Recipe deleted" },
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("RECIPE_ACCESS_DENIED"),
          "404": errorResponse("RECIPE_NOT_FOUND"),
        },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users (admin only)",
        security: bearerAuth,
        parameters: [
          { name: "role", in: "query", schema: { type: "string", enum: ["user", "admin"] } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Matches name or email" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "perPage", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated user list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        data: { type: "array", items: { $ref: "#/components/schemas/User" } },
                        page: { type: "integer" },
                        perPage: { type: "integer" },
                        totalItems: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("ADMIN_ACCESS_REQUIRED"),
        },
      },
    },
    "/admin/users/{id}/role": {
      patch: {
        tags: ["Admin"],
        summary: "Change a user's role (admin only)",
        description: "Refuses to demote the last remaining admin.",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: { role: { type: "string", enum: ["user", "admin"] } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Role updated" },
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("ADMIN_ACCESS_REQUIRED"),
          "404": errorResponse("USER_NOT_FOUND"),
          "409": errorResponse("LAST_ADMIN_PROTECTED"),
        },
      },
    },
    "/admin/users/{id}/block": {
      patch: {
        tags: ["Admin"],
        summary: "Block or unblock a user (admin only)",
        description: "A blocked user's already-issued access tokens are rejected immediately, and they can't log in.",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["isBlocked"],
                properties: { isBlocked: { type: "boolean" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Block status updated" },
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("ADMIN_ACCESS_REQUIRED"),
          "404": errorResponse("USER_NOT_FOUND"),
        },
      },
    },
    "/admin/users/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Delete a user (admin only)",
        description:
          "Cascade-deletes the user's own recipes (and removes them from other users' favorites), " +
          "their sessions, and refuses to delete the last remaining admin.",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "User deleted" },
          "401": errorResponse("Unauthorized"),
          "403": errorResponse("ADMIN_ACCESS_REQUIRED"),
          "404": errorResponse("USER_NOT_FOUND"),
          "409": errorResponse("LAST_ADMIN_PROTECTED"),
        },
      },
    },
  },
};
