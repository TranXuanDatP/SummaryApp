import {
  AggregateRoot,
  DomainException,
  DomainErrorCode,
  type IEventMetadata,
} from 'src/libs/core/domain';
import { CommentId } from '../value-objects';
import {
  CommentCreatedEvent,
  CommentUpdatedEvent,
  CommentDeletedEvent,
} from '../events';

const MAX_CONTENT_LENGTH = 2000;

export interface CommentProps {
  workLogId: string;
  authorId: string;
  content: string;
}

export class Comment extends AggregateRoot {
  private _props: CommentProps;
  private _deletedAt?: Date | null = null;

  get workLogId(): string {
    return this._props.workLogId;
  }
  get authorId(): string {
    return this._props.authorId;
  }
  get content(): string {
    return this._props.content;
  }
  get isDeleted(): boolean {
    return !!this._deletedAt;
  }
  get deletedAt(): Date | undefined | null {
    return this._deletedAt;
  }

  private constructor(
    id: CommentId,
    props: CommentProps,
    version?: number,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ) {
    super(id.value, version, createdAt, updatedAt);
    this._props = props;
    this._deletedAt = deletedAt ?? null;
  }

  static create(
    id: CommentId,
    props: CommentProps,
    metadata?: IEventMetadata,
  ): Comment {
    Comment.validateContent(props.content);
    const trimmedContent = props.content.trim();

    const trimmedWorkLogId = (props.workLogId || '').trim();
    if (!trimmedWorkLogId) {
      throw new DomainException(
        'WorkLog ID is required',
        DomainErrorCode.COMMENT_WORKLOG_ID_REQUIRED,
      );
    }
    if (trimmedWorkLogId.length > 50) {
      throw new DomainException(
        'WorkLog ID cannot exceed 50 characters',
        DomainErrorCode.COMMENT_WORKLOG_ID_TOO_LONG,
      );
    }

    const trimmedAuthorId = (props.authorId || '').trim();
    if (!trimmedAuthorId) {
      throw new DomainException(
        'Author ID is required',
        DomainErrorCode.COMMENT_AUTHOR_ID_REQUIRED,
      );
    }
    if (trimmedAuthorId.length > 50) {
      throw new DomainException(
        'Author ID cannot exceed 50 characters',
        DomainErrorCode.COMMENT_AUTHOR_ID_TOO_LONG,
      );
    }

    const comment = new Comment(id, {
      workLogId: trimmedWorkLogId,
      authorId: trimmedAuthorId,
      content: trimmedContent,
    });

    comment.addDomainEvent(
      new CommentCreatedEvent(
        id.value,
        {
          workLogId: trimmedWorkLogId,
          authorId: trimmedAuthorId,
          content: trimmedContent,
        },
        metadata,
      ),
    );

    return comment;
  }

  static reconstitute(
    id: string,
    props: CommentProps,
    version: number,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?: Date | null,
  ): Comment {
    return new Comment(
      new CommentId(id),
      { ...props },
      version,
      createdAt,
      updatedAt,
      deletedAt,
    );
  }

  updateContent(newContent: string, metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    Comment.validateContent(newContent);
    const trimmed = newContent.trim();
    this._props = { ...this._props, content: trimmed };
    this.markAsDirty();

    this.addDomainEvent(
      new CommentUpdatedEvent(this.id, { content: trimmed }, metadata),
    );
  }

  delete(metadata?: IEventMetadata): void {
    this.ensureNotDeleted();
    this._deletedAt = new Date();
    this.markAsDirty();

    this.addDomainEvent(
      new CommentDeletedEvent(
        this.id,
        { deletedAt: this._deletedAt.toISOString() },
        metadata,
      ),
    );
  }

  private ensureNotDeleted(): void {
    if (this.isDeleted) {
      throw new DomainException(
        'Comment is already deleted',
        DomainErrorCode.COMMENT_ALREADY_DELETED,
      );
    }
  }

  private static validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new DomainException(
        'Comment content is required',
        DomainErrorCode.COMMENT_CONTENT_REQUIRED,
      );
    }
    if (content.trim().length > MAX_CONTENT_LENGTH) {
      throw new DomainException(
        `Comment content cannot exceed ${MAX_CONTENT_LENGTH} characters`,
        DomainErrorCode.COMMENT_CONTENT_TOO_LONG,
      );
    }
  }
}
