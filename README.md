# Intelligent Islamic Land Inheritance Division System

A production-oriented Arabic-first web prototype for dividing inherited land according to Islamic inheritance law (Faraid), while visualizing practical parcel subdivision, buildings, access paths, validation, and proposal scoring.

## What is included

- RTL, Arabic-first three-panel planning workspace.
- Property, building, and heir data panels.
- Islamic inheritance share calculation for common fixed heirs and children residue distribution.
- Replaceable subdivision-engine interface pattern with multiple scored proposals.
- Layered 2D SVG drawing workspace for land boundary, buildings, roads, shared access, parcels, labels, dimensions, and ownership overlay.
- Parcel/heir synchronized selection, numeric-editing placeholders, status bar, validation messages, and export action surface.

## Architecture

The implementation is intentionally modular even in the dependency-free prototype:

1. **UI Layer** renders panels, workspace, tables, and property inspectors.
2. **Drawing Layer** serializes model geometry into SVG layers.
3. **Geometry Utilities** provide polygon area, centroids, and display-area conversions.
4. **Inheritance Engine** calculates Faraid shares from wizard input.
5. **Subdivision Engine** generates replaceable proposal sets with scoring metadata.
6. **Validation Layer** checks share deviation and access constraints before surfacing warnings.

## Run locally

```bash
npm run dev
```

Open `http://localhost:5173`.

## Quality check

```bash
npm run build
```
