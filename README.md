# 🎙️ Walter Meeting

> *Transforme sus reuniones con Inteligencia Artificial*

Walter Meeting es un sistema inteligente que utiliza agentes de IA para transcribir, analizar, resumir y planificar a partir de grabaciones de reuniones. Inspirado en "La vida secreta de Walter Mitty", esta aplicación transforma tus reuniones en información accionable y planes concretos.

## ✨ Características

- 🎯 **Transcripción automática** con OpenAI Whisper
- 🧠 **Análisis inteligente** de contenido y sentimientos
- 📝 **Resúmenes automáticos** con puntos clave
- ✅ **Seguimiento de objetivos** y tareas
- 📊 **Planes de acción** con cartas Gantt
- 📄 **Informes en Word** descargables
- 🎨 **Interfaz moderna** y profesional

## 🚀 Demo en Vivo

[Ver Demo](https://walter-meeting.onrender.com) *(Próximamente)*

## 📋 Requisitos

- Node.js 18+
- Clave API de OpenAI

## ⚙️ Instalación

1. **Clona el repositorio**
```bash
git clone https://github.com/tu-usuario/walter-meeting.git
cd walter-meeting
```

2. **Instala las dependencias**
```bash
npm install
```

3. **Configura las variables de entorno**
```bash
cp .env.example .env
```

Edita `.env` y agrega tu clave API de OpenAI:
```env
OPENAI_API_KEY=tu_clave_api_de_openai
PORT=3001
```

4. **Inicia la aplicación**
```bash
npm start
```

5. **Abre tu navegador**
```
http://localhost:3001
```

## 🔧 Desarrollo

```bash
npm run dev
```

## 🔄 Cómo funciona

1. **📤 Sube tu audio** - Arrastra y suelta archivos de reuniones
2. **🎯 Transcripción automática** - OpenAI Whisper convierte audio a texto
3. **🧠 Análisis inteligente** - IA identifica temas, objetivos y tareas
4. **📝 Resumen ejecutivo** - Genera resúmenes concisos y accionables
5. **📊 Plan de acción** - Crea cronogramas con cartas Gantt
6. **📄 Descarga informes** - Exporta todo en formato Word profesional

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **IA**: OpenAI API (Whisper + GPT)
- **Frontend**: JavaScript ES6+ + Chart.js
- **Documentos**: docx para informes Word
- **Arquitectura**: Agentes especializados modulares

## 📁 Estructura del Proyecto

```
walter-meeting/
├── src/
│   ├── agents/          # Agentes de IA especializados
│   ├── api/             # API REST
│   ├── core/            # Coordinador central
│   └── ui/              # Interfaz de usuario
├── public/              # Archivos estáticos
├── storage/             # Almacenamiento temporal
└── index.html           # Página principal
```

## 🚀 Despliegue en Render

1. **Fork este repositorio**
2. **Conecta con Render**
3. **Configura variables de entorno**:
   - `OPENAI_API_KEY`
   - `NODE_ENV=production`
4. **Deploy automático** ✨

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

MIT © Lucas Lobos (https://github.com/lucaslobosp)

---

<div align="center">
  <strong>🎙️ Walter Meeting - Transformando reuniones con IA</strong>
</div>
