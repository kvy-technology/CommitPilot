
export async function delay(duration: number) {
  await new Promise((resolve) => setTimeout(resolve, duration))
}
