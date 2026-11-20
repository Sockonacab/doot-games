export async function uploadMediaFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await $fetch<{ url: string }>('/api/media/upload', {
    method: 'POST',
    body: formData,
  })
  return res.url
}