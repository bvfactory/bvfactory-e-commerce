export const BUNDLE_THRESHOLD = 3;
export const BUNDLE_PERCENT = 20;

export function getBundleDiscountPercent(itemCount: number): number {
    return itemCount >= BUNDLE_THRESHOLD ? BUNDLE_PERCENT : 0;
}
