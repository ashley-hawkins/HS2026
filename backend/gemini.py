import google.genai as genai

client = genai.Client()

print("=== All models ===")
for m in client.models.list():
    print(m.name, "|", getattr(m, "supported_actions", ""))
