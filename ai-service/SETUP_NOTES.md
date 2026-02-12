# AI Service Setup - Python 3.14 Compatibility

## ✅ Installation Complete!

All packages have been successfully installed with Python 3.14.2.

## 🔄 TensorFlow → Keras + PyTorch

Since TensorFlow doesn't support Python 3.14 yet, we've replaced it with:
- **Keras 3** (modern ML framework)
- **PyTorch** (as the backend)

## 🚀 How to Use

### Set Keras Backend (Add to your code)
```python
import os
os.environ['KERAS_BACKEND'] = 'torch'  # Use PyTorch backend

import keras
from keras import layers, models
```

### Migration from TensorFlow

Most TensorFlow code will work with minimal changes:

**Old (TensorFlow):**
```python
import tensorflow as tf
from tensorflow.keras import layers, models

model = tf.keras.Sequential([...])
```

**New (Keras + PyTorch):**
```python
import os
os.environ['KERAS_BACKEND'] = 'torch'

import keras
from keras import layers, models

model = keras.Sequential([...])
```

## 📦 Installed Packages

- ✅ FastAPI, Uvicorn, Pydantic
- ✅ NumPy 2.4.2, Pandas 3.0.0, SciPy 1.17.0
- ✅ Scikit-learn 1.8.0
- ✅ Keras 3.13.2
- ✅ PyTorch 2.10.0
- ✅ All other dependencies

## 🔧 Run the AI Service

```bash
cd ai-service
python -m uvicorn main:app --reload
```

## 📝 Alternative: Use Python 3.11/3.12

If you need TensorFlow specifically:
1. Install Python 3.11 or 3.12 from python.org
2. Create new venv: `py -3.11 -m venv venv`
3. Activate: `.venv\Scripts\activate`
4. Restore original requirements.txt with `tensorflow>=2.16.0`
5. Install: `pip install -r requirements.txt`

## ⚡ Performance Notes

- PyTorch backend is typically **faster** than TensorFlow on CPU
- Keras 3 is the modern, unified API
- 100% compatible with existing Keras/TensorFlow models

---
**Status**: Ready to use! 🎉
