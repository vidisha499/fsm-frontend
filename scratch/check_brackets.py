
with open('src/app/app.component.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    opens = line.count('{')
    closes = line.count('}')
    balance += opens - closes
    print(f"Line {i+1}: Balance={balance} | {line.strip()[:50]}")
    if balance < 0:
        print(f"!!! BALANCE DROPPED BELOW ZERO AT LINE {i+1} !!!")
        break
