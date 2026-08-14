# Project Conventions

## Server/Client Boundary

This rule is a **hard constraint** for this codebase.

A **Server Component may only pass** the following into a Client Component:
- strings
- numbers
- booleans
- arrays
- plain serializable objects
- `null`
- `undefined`

A Server Component must **never pass**:
- functions
- class instances
- Mongoose documents
- `Map`, `Set`, `Date` objects that have not been serialized
- database clients
- non-plain objects of any kind

### Required patterns

If a component needs an event handler and its parent is a Server Component, then one of these must be true:
1. the component itself is marked with `"use client"` and owns the handler internally, or
2. the component receives a **Server Action** reference

### Serialization rules

Before data crosses a Server → Client boundary or is returned from a Route Handler JSON response:
- convert Mongoose query results to plain serializable data
- prefer `.lean()` on reads where possible
- convert `Date` values to ISO strings when they are intended for client props or JSON output
- never spread raw Mongoose documents into props

### Future prompt rule

At the top of every future prompt for this project, reference this file and treat it as a **mandatory implementation constraint**, not a suggestion.
