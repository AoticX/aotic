# Master Data & Static Structures

This document outlines the core static data structures required to populate the CRM.

## Business Verticals (The 6 Pillars)
[cite_start]Every service, package, and QC checklist revolves around these 6 supported verticals[cite: 7]:
1. [cite_start]Audio & Acoustics [cite: 8]
2. [cite_start]Interior Themes & Custom Seat Designs [cite: 9]
3. [cite_start]Sun Protection Film, PPF & Detailing [cite: 10]
4. [cite_start]Base-to-Top OEM Upgrades [cite: 11]
5. [cite_start]Custom Cores (Headlights, Conversions, Body Kits) [cite: 12]
6. [cite_start]Lighting & Visibility Solutions [cite: 13]

## Pricing Dimensions
Pricing is matrix-based, depending on the service tier and the vehicle size.
* [cite_start]**4 Package Tiers**: Essential, Enhanced, Elite, Luxe (applicable per vertical)[cite: 37].
* [cite_start]**Car Segments**: Hatchback, Sedan, SUV, Luxury[cite: 37].

## Inventory & Material Data
* [cite_start]**Product Master**: Tracks approximately 200+ SKUs[cite: 104, 323].
* [cite_start]**Attributes**: SKU ID, Brand, Unit of Measurement (primarily pieces), Serial Number tracking (where applicable), selling range[cite: 104, 571, 718].
* **Stock Logic States**:
    * [cite_start]**Available**: Current quantities in stock[cite: 105].
    * [cite_start]**Reserved**: Materials booked against a confirmed job but not yet consumed[cite: 48, 107].
    * [cite_start]**Consumed**: Auto-deducted from available inventory when a technician logs usage on a job card[cite: 60, 106].
* [cite_start]**Customer Supplied**: A flag indicating parts brought by the customer (bypasses inventory deduction, charges installation only)[cite: 110].
