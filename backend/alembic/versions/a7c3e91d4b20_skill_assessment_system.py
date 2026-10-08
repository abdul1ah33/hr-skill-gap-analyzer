"""skill assessment system

- Drops the unused legacy assessment tables (assessments, assessment_skills,
  assessment_questions, assessment_results, assessment_answers).
- Removes EXPERT from the skilllevel enum.
- Stores all skill names and aliases in lowercase (CHECK constraint).
- Creates the question bank (skill_questions, skill_question_options) and the
  new attempt tables (assessments, assessment_skills, assessment_questions).
- Adds verified / last_assessed_at / last_assessment_id to employee_skills.

See plans/tasks/00_skill_assessment_implementation_plan.md (§2, §14, §A).

Revision ID: a7c3e91d4b20
Revises: f2908fc365d4
Create Date: 2026-10-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a7c3e91d4b20'
down_revision: Union[str, Sequence[str], None] = 'f2908fc365d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LEGACY_TABLES = [
    # FK order: children first
    'assessment_answers',
    'assessment_results',
    'assessment_questions',
    'assessment_skills',
    'assessments',
]

NEW_ENUMS = {
    'questionoptiontype': (
        'CORRECT', 'NEAR_MISS', 'MISCONCEPTION',
        'PLAUSIBLE_WRONG_1', 'PLAUSIBLE_WRONG_2', 'PLAUSIBLE_WRONG_3',
    ),
    'assessmentstatus': (
        'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'TERMINATED', 'CANCELLED',
    ),
    'assessmentadministration': ('SELF', 'HR_ON_BEHALF'),
    'skillgapcategory': ('MATCHED', 'NEEDS_IMPROVEMENT', 'UNMATCHED'),
    'profileaction': (
        'CONFIRMED', 'UPGRADED', 'DOWNGRADED', 'CREATED', 'REMOVED',
        'NO_CHANGE', 'NOT_APPLIED',
    ),
}


def _enum(name: str) -> postgresql.ENUM:
    if name == 'skilllevel':
        return postgresql.ENUM(name='skilllevel', create_type=False)
    return postgresql.ENUM(*NEW_ENUMS[name], name=name, create_type=False)


def _abort_if(sql: str, message: str) -> None:
    rows = op.get_bind().execute(sa.text(sql)).fetchall()
    if rows:
        raise RuntimeError(f"{message}: {rows[:10]}")


def _swap_skilllevel(values: tuple[str, ...]) -> None:
    op.execute("ALTER TYPE skilllevel RENAME TO skilllevel_old")
    op.execute(
        "CREATE TYPE skilllevel AS ENUM ("
        + ", ".join(f"'{v}'" for v in values)
        + ")"
    )
    op.execute(
        "ALTER TABLE employee_skills ALTER COLUMN level "
        "TYPE skilllevel USING level::text::skilllevel"
    )
    op.execute(
        "ALTER TABLE position_skills ALTER COLUMN required_skill_level "
        "TYPE skilllevel USING required_skill_level::text::skilllevel"
    )
    op.execute("DROP TYPE skilllevel_old")


def upgrade() -> None:
    # ─── Guards: never destroy or silently merge data ───────────────────────
    for table in LEGACY_TABLES:
        _abort_if(
            f"SELECT 1 FROM {table} LIMIT 1",
            f"Legacy table {table} is not empty; migrate its data first",
        )
    _abort_if(
        "SELECT id FROM employee_skills WHERE level = 'EXPERT' "
        "UNION ALL SELECT id FROM position_skills WHERE required_skill_level = 'EXPERT'",
        "Rows still use skill level EXPERT; change them to ADVANCED first",
    )
    _abort_if(
        "SELECT lower(btrim(name)), array_agg(name) FROM skills "
        "GROUP BY 1 HAVING count(*) > 1",
        "Skill names collide when lowercased; merge these skills first",
    )
    _abort_if(
        "SELECT lower(btrim(alias)), array_agg(alias) FROM skill_aliases "
        "GROUP BY 1 HAVING count(*) > 1",
        "Skill aliases collide when lowercased; merge these aliases first",
    )

    # ─── Legacy assessment tables ───────────────────────────────────────────
    for table in LEGACY_TABLES:
        op.drop_table(table)

    # ─── skilllevel without EXPERT ──────────────────────────────────────────
    _swap_skilllevel(('BEGINNER', 'INTERMEDIATE', 'ADVANCED'))

    # ─── Lowercase skill names and aliases ──────────────────────────────────
    op.execute(
        "UPDATE skills SET name = lower(regexp_replace(btrim(name), '\\s+', ' ', 'g'))"
    )
    op.execute(
        "UPDATE skill_aliases SET alias = lower(regexp_replace(btrim(alias), '\\s+', ' ', 'g'))"
    )
    op.create_check_constraint('ck_skills_name_lowercase', 'skills', 'name = lower(name)')

    # ─── New enum types ─────────────────────────────────────────────────────
    bind = op.get_bind()
    for name, values in NEW_ENUMS.items():
        postgresql.ENUM(*values, name=name).create(bind, checkfirst=False)

    # ─── Question bank ──────────────────────────────────────────────────────
    op.create_table(
        'skill_questions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('skill_id', sa.Integer(),
                  sa.ForeignKey('skills.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('proficiency_level', _enum('skilllevel'), nullable=False),
        sa.Column('content_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('source', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        'ix_skill_questions_skill_level_active',
        'skill_questions',
        ['skill_id', 'proficiency_level', 'is_active'],
    )

    op.create_table(
        'skill_question_options',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('question_id', sa.Integer(),
                  sa.ForeignKey('skill_questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('option_type', _enum('questionoptiontype'), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.UniqueConstraint('question_id', 'option_type'),
    )

    # ─── Attempts ───────────────────────────────────────────────────────────
    op.create_table(
        'assessments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('employee_id', sa.Integer(),
                  sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
        sa.Column('position_id', sa.Integer(),
                  sa.ForeignKey('positions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('position_title', sa.String(150), nullable=True),
        sa.Column('status', _enum('assessmentstatus'), nullable=False),
        sa.Column('administered_by', _enum('assessmentadministration'), nullable=True),
        sa.Column('assigned_by_user_id', sa.Integer(),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('due_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_by_user_id', sa.Integer(),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('seconds_per_question', sa.Integer(), nullable=True),
        sa.Column('max_violations', sa.Integer(), nullable=True),
        sa.Column('violation_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('session_token_hash', sa.String(64), nullable=True),
        sa.Column('session_user_id', sa.Integer(),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('session_last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('applied_to_profile', sa.Boolean(), nullable=False,
                  server_default=sa.text('false')),
        sa.Column('scoring_version', sa.String(30), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_assessments_employee_id', 'assessments', ['employee_id'])
    op.create_index(
        'uq_assessments_one_active_per_employee',
        'assessments',
        ['employee_id'],
        unique=True,
        postgresql_where=sa.text("status IN ('ASSIGNED', 'IN_PROGRESS')"),
    )

    op.create_table(
        'assessment_skills',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('assessment_id', sa.Integer(),
                  sa.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_id', sa.Integer(),
                  sa.ForeignKey('skills.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('category', _enum('skillgapcategory'), nullable=False),
        sa.Column('is_essential', sa.Boolean(), nullable=False),
        sa.Column('claimed_level', _enum('skilllevel'), nullable=True),
        sa.Column('required_level', _enum('skilllevel'), nullable=True),
        sa.Column('beginner_correct', sa.Integer(), nullable=True),
        sa.Column('intermediate_correct', sa.Integer(), nullable=True),
        sa.Column('advanced_correct', sa.Integer(), nullable=True),
        sa.Column('total_correct', sa.Integer(), nullable=True),
        sa.Column('assessed_level', _enum('skilllevel'), nullable=True),
        sa.Column('graded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('profile_action', _enum('profileaction'), nullable=True),
        sa.UniqueConstraint('assessment_id', 'skill_id'),
        sa.UniqueConstraint('assessment_id', 'display_order'),
    )

    op.create_table(
        'assessment_questions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('assessment_id', sa.Integer(),
                  sa.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assessment_skill_id', sa.Integer(),
                  sa.ForeignKey('assessment_skills.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_question_id', sa.Integer(),
                  sa.ForeignKey('skill_questions.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('proficiency_level', _enum('skilllevel'), nullable=False),
        sa.Column('option_order', postgresql.JSONB(), nullable=False),
        sa.Column('selected_option_id', sa.Integer(),
                  sa.ForeignKey('skill_question_options.id', ondelete='RESTRICT'),
                  nullable=True),
        sa.Column('selected_option_type', _enum('questionoptiontype'), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('answered_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('assessment_id', 'display_order'),
        sa.UniqueConstraint('assessment_id', 'skill_question_id'),
    )

    # ─── employee_skills verification columns ───────────────────────────────
    op.add_column('employee_skills', sa.Column(
        'verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('employee_skills', sa.Column(
        'last_assessed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('employee_skills', sa.Column(
        'last_assessment_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_employee_skills_last_assessment_id',
        'employee_skills', 'assessments',
        ['last_assessment_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_employee_skills_last_assessment_id', 'employee_skills', type_='foreignkey')
    op.drop_column('employee_skills', 'last_assessment_id')
    op.drop_column('employee_skills', 'last_assessed_at')
    op.drop_column('employee_skills', 'verified')

    op.drop_table('assessment_questions')
    op.drop_table('assessment_skills')
    op.drop_index('uq_assessments_one_active_per_employee', table_name='assessments')
    op.drop_index('ix_assessments_employee_id', table_name='assessments')
    op.drop_table('assessments')
    op.drop_table('skill_question_options')
    op.drop_index('ix_skill_questions_skill_level_active', table_name='skill_questions')
    op.drop_table('skill_questions')

    bind = op.get_bind()
    for name in NEW_ENUMS:
        postgresql.ENUM(name=name).drop(bind, checkfirst=False)

    # Original casing of skill names cannot be restored
    op.drop_constraint('ck_skills_name_lowercase', 'skills', type_='check')

    _swap_skilllevel(('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'))

    # ─── Legacy tables (empty), as in b6b4472c0459 ──────────────────────────
    op.create_table('assessments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('difficulty', sa.String(length=30), nullable=True),
    sa.Column('passing_score', sa.Integer(), nullable=True),
    sa.Column('duration_minutes', sa.Integer(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('assessment_questions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.Integer(), nullable=False),
    sa.Column('question_text', sa.Text(), nullable=False),
    sa.Column('question_type', sa.String(length=30), nullable=True),
    sa.Column('option_a', sa.String(length=255), nullable=True),
    sa.Column('option_b', sa.String(length=255), nullable=True),
    sa.Column('option_c', sa.String(length=255), nullable=True),
    sa.Column('option_d', sa.String(length=255), nullable=True),
    sa.Column('correct_answer', sa.String(length=255), nullable=True),
    sa.Column('points', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('assessment_results',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('employee_id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.Integer(), nullable=False),
    sa.Column('score', sa.Integer(), nullable=True),
    sa.Column('percentage', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=True),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('attempt_number', sa.Integer(), nullable=True),
    sa.Column('feedback', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ),
    sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('assessment_skills',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.Integer(), nullable=False),
    sa.Column('skill_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ),
    sa.ForeignKeyConstraint(['skill_id'], ['skills.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('assessment_id', 'skill_id')
    )
    op.create_table('assessment_answers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('result_id', sa.Integer(), nullable=False),
    sa.Column('question_id', sa.Integer(), nullable=False),
    sa.Column('employee_answer', sa.Text(), nullable=True),
    sa.Column('is_correct', sa.Boolean(), nullable=True),
    sa.Column('earned_points', sa.Integer(), nullable=True),
    sa.Column('answered_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['question_id'], ['assessment_questions.id'], ),
    sa.ForeignKeyConstraint(['result_id'], ['assessment_results.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
