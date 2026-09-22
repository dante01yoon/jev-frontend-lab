"""Download the pinned official checkpoint; does not install or replace the runtime."""
from huggingface_hub import snapshot_download

if __name__ == '__main__':
    path = snapshot_download('convaiinnovations/laya-multilingual', revision='052592a15d198d9ad47da779604259b10b47b7aa',
        allow_patterns=['rl_agent_config.json','model.safetensors','tokenizer/*','encoder/*'])
    print('Pinned multilingual checkpoint ready:', path)
