import rawDataset from "@/data/disclosures.json";
import { parseDisclosureDataset, type DisclosureDataset } from "./disclosures";

/** The shipped disclosure log, validated once at load. */
export const disclosureDataset: DisclosureDataset = parseDisclosureDataset(rawDataset);
