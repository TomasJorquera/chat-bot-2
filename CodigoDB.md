Table roles {
  id int [pk]
  nombre varchar
}

Table users {
  id uuid [pk]

  nombre varchar
  apellido varchar

  correo varchar [unique]
  password_hash text

  role_id int

  activo boolean

  created_at timestamp
  updated_at timestamp
}

Ref: users.role_id > roles.id

// =====================================
// CURSOS
// =====================================

Table courses {
  id uuid [pk]

  nombre varchar
  nivel varchar
  seccion varchar

  anio int

  created_at timestamp
}

// =====================================
// RAMOS
// =====================================

Table subjects {
  id uuid [pk]

  codigo varchar [unique]
  nombre varchar

  descripcion text

  created_at timestamp
}

// =====================================
// PROFESOR ↔ CURSO ↔ RAMO
// =====================================

Table teacher_subjects {
  id uuid [pk]

  teacher_id uuid
  subject_id uuid
  course_id uuid

  created_at timestamp
}

Ref: teacher_subjects.teacher_id > users.id
Ref: teacher_subjects.subject_id > subjects.id
Ref: teacher_subjects.course_id > courses.id

// =====================================
// ALUMNOS ↔ CURSOS
// =====================================

Table student_courses {
  id uuid [pk]

  student_id uuid
  course_id uuid

  created_at timestamp
}

Ref: student_courses.student_id > users.id
Ref: student_courses.course_id > courses.id

// =====================================
// ALUMNOS ↔ RAMOS
// =====================================

Table student_subjects {
  id uuid [pk]

  student_id uuid
  subject_id uuid

  created_at timestamp
}

Ref: student_subjects.student_id > users.id
Ref: student_subjects.subject_id > subjects.id

// =====================================
// AGENTES IA
// =====================================

Table ai_agents {
  id uuid [pk]

  nombre varchar
  descripcion text

  categoria varchar

  edad int

  nivel_educativo varchar

  activo boolean

  created_at timestamp
}

// =====================================
// MODELOS IA
// =====================================

Table ai_models {
  id uuid [pk]

  nombre varchar

  provider varchar

  tipo varchar
  // chat
  // tts
  // evaluator

  input_cost decimal
  output_cost decimal
  cache_cost decimal

  activo boolean

  created_at timestamp
}

// =====================================
// VERSIONES DE AGENTES
// =====================================

Table agent_profiles {
  id uuid [pk]

  agent_id uuid

  version varchar
  nombre_version varchar

  system_prompt text

  chat_model_id uuid

  tts_model_id uuid

  tts_voice varchar

  temperature decimal
  max_tokens int
  top_p decimal

  activo boolean

  created_at timestamp
  updated_at timestamp
}

Ref: agent_profiles.agent_id > ai_agents.id

Ref: agent_profiles.chat_model_id > ai_models.id
Ref: agent_profiles.tts_model_id > ai_models.id

// =====================================
// PERFILES DE EVALUACION
// =====================================

Table evaluation_profiles {
  id uuid [pk]

  nombre varchar

  version varchar

  descripcion text

  system_prompt text

  model_id uuid

  activo boolean

  created_at timestamp
  updated_at timestamp
}

Ref: evaluation_profiles.model_id > ai_models.id

// =====================================
// SIMULACIONES
// =====================================

Table simulations {
  id uuid [pk]

  titulo varchar

  descripcion text

  instrucciones text

  objetivos text

  teacher_id uuid

  subject_id uuid
  course_id uuid

  agent_profile_id uuid

  evaluation_profile_id uuid

  fecha_inicio date
  fecha_termino date

  estado varchar

  created_at timestamp
  updated_at timestamp
}

Ref: simulations.teacher_id > users.id
Ref: simulations.subject_id > subjects.id
Ref: simulations.course_id > courses.id

Ref: simulations.agent_profile_id > agent_profiles.id
Ref: simulations.evaluation_profile_id > evaluation_profiles.id

// =====================================
// CRITERIOS DE EVALUACION
// =====================================

Table simulation_criteria {
  id uuid [pk]

  simulation_id uuid

  criterio varchar

  descripcion text

  obligatorio boolean

  created_at timestamp
}

Ref: simulation_criteria.simulation_id > simulations.id

// =====================================
// MATERIAL DE APOYO
// =====================================

Table materials {
  id uuid [pk]

  titulo varchar

  descripcion text

  archivo_url text

  teacher_id uuid

  subject_id uuid
  course_id uuid

  created_at timestamp
}

Ref: materials.teacher_id > users.id
Ref: materials.subject_id > subjects.id
Ref: materials.course_id > courses.id

// =====================================
// TAREAS
// =====================================

Table assignments {
  id uuid [pk]

  titulo varchar

  descripcion text

  fecha_entrega timestamp

  teacher_id uuid

  subject_id uuid
  course_id uuid

  created_at timestamp
}

Ref: assignments.teacher_id > users.id
Ref: assignments.subject_id > subjects.id
Ref: assignments.course_id > courses.id

// =====================================
// ENTREGAS
// =====================================

Table assignment_submissions {
  id uuid [pk]

  assignment_id uuid

  student_id uuid

  archivo_url text

  comentario text

  nota decimal

  feedback text

  submitted_at timestamp
}

Ref: assignment_submissions.assignment_id > assignments.id
Ref: assignment_submissions.student_id > users.id

// =====================================
// SESIONES DE SIMULACION
// =====================================

Table simulation_sessions {
  id uuid [pk]

  simulation_id uuid

  student_id uuid

  started_at timestamp
  finished_at timestamp

  score int

  pdf_url text

  total_cost decimal

  total_input_tokens int
  total_output_tokens int
  total_cached_tokens int

  created_at timestamp
}

Ref: simulation_sessions.simulation_id > simulations.id
Ref: simulation_sessions.student_id > users.id

// =====================================
// MENSAJES
// =====================================

Table simulation_messages {
  id uuid [pk]

  session_id uuid

  role varchar

  content text

  input_tokens int
  output_tokens int
  cached_tokens int

  cost decimal

  created_at timestamp
}

Ref: simulation_messages.session_id > simulation_sessions.id

// =====================================
// RESULTADO EVALUACION
// =====================================

Table evaluations {
  id uuid [pk]

  session_id uuid

  performance_range varchar

  total_score int

  conclusion text

  created_at timestamp
}

Ref: evaluations.session_id > simulation_sessions.id

// =====================================
// RESULTADO POR CRITERIO
// =====================================

Table evaluation_criteria_results {
  id uuid [pk]

  evaluation_id uuid

  criterion_name varchar

  compliance varchar

  analysis text

  justification text

  created_at timestamp
}

Ref: evaluation_criteria_results.evaluation_id > evaluations.id

// =====================================
// COSTOS HISTORICOS IA
// =====================================

Table ai_cost_logs {
  id uuid [pk]

  session_id uuid

  model_id uuid

  input_tokens int
  output_tokens int
  cached_tokens int

  total_cost decimal

  created_at timestamp
}

Ref: ai_cost_logs.session_id > simulation_sessions.id
Ref: ai_cost_logs.model_id > ai_models.id